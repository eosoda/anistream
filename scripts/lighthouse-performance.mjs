import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lighthouseCli = join(projectRoot, 'node_modules', 'lighthouse', 'cli', 'index.js');
const targetUrl = process.env.LIGHTHOUSE_URL ?? 'http://localhost:3000/';
const observed = process.argv.includes('--observed');
const reportDirectory = join(projectRoot, 'artifacts', 'lighthouse');
const reportPath = join(
  reportDirectory,
  observed ? 'mobile-observed.json' : 'mobile-simulated.json',
);

const scoredAudits = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'speed-index',
  'total-blocking-time',
  'cumulative-layout-shift',
].join(',');

function findChrome() {
  if (process.env.LIGHTHOUSE_CHROME_PATH) {
    return process.env.LIGHTHOUSE_CHROME_PATH;
  }

  if (process.platform === 'win32') {
    const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
    return join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe');
  }

  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  return 'google-chrome';
}

async function reservePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(error => {
        if (error || port === null) reject(error ?? new Error('Porta CDP indisponível.'));
        else resolvePort(port);
      });
    });
  });
}

async function waitForChrome(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch {
      // O Chrome ainda está iniciando.
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 150));
  }

  throw new Error('O Chrome não abriu a porta de depuração a tempo.');
}

async function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolveRun();
      else reject(new Error(`Lighthouse encerrou com código ${code ?? 'desconhecido'}.`));
    });
  });
}

async function stopChrome(chrome) {
  if (chrome.exitCode !== null) return;

  chrome.kill();
  await Promise.race([
    new Promise(resolveExit => chrome.once('exit', resolveExit)),
    new Promise(resolveWait => setTimeout(resolveWait, 2_000)),
  ]);

  if (chrome.exitCode === null && process.platform === 'win32') {
    await new Promise(resolveKill => {
      const killer = spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('exit', resolveKill);
      killer.once('error', resolveKill);
    });
  }
}

const port = await reservePort();
const profileDirectory = await mkdtemp(join(tmpdir(), 'anistream-lighthouse-'));
const chrome = spawn(findChrome(), [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${profileDirectory}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  'about:blank',
], {
  stdio: 'ignore',
  windowsHide: true,
});

try {
  await waitForChrome(port);
  await mkdir(reportDirectory, { recursive: true });
  await run(process.execPath, [
    lighthouseCli,
    targetUrl,
    `--port=${port}`,
    `--only-audits=${scoredAudits}`,
    `--throttling-method=${observed ? 'provided' : 'simulate'}`,
    '--output=json',
    `--output-path=${reportPath}`,
    '--quiet',
  ]);

  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const audits = report.audits;
  const score = Math.round(report.categories.performance.score * 100);

  console.log(`\nPerformance móvel: ${score}/100 (${observed ? 'observado' : 'simulado'})`);
  console.log(`FCP: ${audits['first-contentful-paint'].displayValue}`);
  console.log(`LCP: ${audits['largest-contentful-paint'].displayValue}`);
  console.log(`Speed Index: ${audits['speed-index'].displayValue}`);
  console.log(`TBT: ${audits['total-blocking-time'].displayValue}`);
  console.log(`CLS: ${audits['cumulative-layout-shift'].displayValue}`);
  console.log(`Relatório: ${reportPath}`);
} finally {
  await stopChrome(chrome);
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
