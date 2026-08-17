import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

let cachedToken: string | undefined;
let sessionPromise: Promise<string> | undefined;
const routedPages = new WeakSet<Page>();

function envValue(name: string): string | undefined {
  const direct = process.env[name];
  if (direct) return direct;
  try {
    const source = readFileSync('.env', 'utf8');
    return source.match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
  } catch {
    return undefined;
  }
}

async function createAdminSession(page: Page): Promise<string> {
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').origin;
  const requestOrigin = envValue('E2E_APP_ORIGIN') ?? envValue('NEXT_PUBLIC_APP_URL') ?? baseUrl;
  const setupKey = envValue('INITIAL_SETUP_KEY');
  const email = envValue('E2E_ADMIN_EMAIL') ?? 'e2e-admin@anistream.test';
  const password = envValue('E2E_ADMIN_PASSWORD') ?? 'E2e-admin-password-2026!';

  if (setupKey) {
    await page.request.post(`${baseUrl}/api/setup/initialize`, {
      headers: { Origin: requestOrigin, 'x-setup-key': setupKey },
      data: { admin: { name: 'E2E Administrator', email, password } },
    });
  }

  const response = await page.request.post(`${baseUrl}/api/admin/login`, {
    headers: { Origin: requestOrigin },
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Não foi possível criar sessão E2E administrativa (HTTP ${response.status()}). Configure E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD.`);
  }

  // `page.request` shares the browser context cookie jar. Reading it back is
  // more reliable than parsing a potentially combined Set-Cookie header.
  const contextCookie = (await page.context().cookies(baseUrl)).find((cookie) => cookie.name === 'admin_token');
  const setCookie = response.headers()['set-cookie'] ?? '';
  const token = contextCookie?.value ?? setCookie.match(/(?:^|,\s*)admin_token=([^;]+)/)?.[1];
  if (!token) throw new Error('A resposta de login E2E não forneceu o cookie admin_token.');
  return token;
}

export async function signInAdmin(page: Page): Promise<void> {
  sessionPromise ??= Promise.resolve(cachedToken ?? createAdminSession(page)).then((token) => {
    cachedToken = token;
    return token;
  });
  const token = await sessionPromise;
  const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').origin;
  const requestOrigin = envValue('E2E_APP_ORIGIN') ?? envValue('NEXT_PUBLIC_APP_URL') ?? baseUrl;
  if (!routedPages.has(page) && requestOrigin !== baseUrl) {
    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers(), origin: requestOrigin };
      await route.continue({ headers });
    });
    routedPages.add(page);
  }
  await page.context().addCookies([{ name: 'admin_token', value: token, url: baseUrl }]);
}
