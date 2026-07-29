import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SETUP_KEY_FILE = path.join(process.cwd(), '.setup-key');

let cachedSetupKey: string | null = null;
let hasLoggedSetupKey = false;

/**
 * Obtém a chave de instalação definida no ambiente ou lê/gera um token randômico temporário.
 * Mantém a chave em memória para evitar releituras e exibe os logs apenas uma vez.
 */
export function getOrCreateSetupKey(): string {
  if (cachedSetupKey) {
    return cachedSetupKey;
  }

  // 1. Se foi definida no ambiente (INITIAL_SETUP_KEY ou SETUP_KEY)
  const envKey = process.env.INITIAL_SETUP_KEY || process.env.SETUP_KEY;
  if (envKey && envKey.trim().length > 0) {
    cachedSetupKey = envKey.trim();
  } else {
    // 2. Se já existe uma chave temporária salva no arquivo .setup-key
    try {
      if (fs.existsSync(SETUP_KEY_FILE)) {
        const storedKey = fs.readFileSync(SETUP_KEY_FILE, 'utf-8').trim();
        if (storedKey) {
          cachedSetupKey = storedKey;
        }
      }
    } catch {
      // Ignorar erros de leitura de arquivo
    }

    // 3. Gerar nova chave randômica única se não existir
    if (!cachedSetupKey) {
      cachedSetupKey = `setup_${crypto.randomBytes(12).toString('hex')}`;
      try {
        fs.writeFileSync(SETUP_KEY_FILE, cachedSetupKey, { encoding: 'utf-8', mode: 0o600 });
      } catch {
        // Ignorar falha de gravação de arquivo se o sistema for read-only
      }
    }
  }

  // Exibir a chave com destaque nos logs do container / terminal APENAS UMA VEZ
  if (!hasLoggedSetupKey) {
    hasLoggedSetupKey = true;
    console.log('\n===================================================================');
    console.log('  [AniStream Security] 🔑 CHAVE DE INSTALAÇÃO DO SETUP INICIAL:');
    console.log(`  --> ${cachedSetupKey} <--`);
    console.log('  Insira esta chave no assistente /setup para configurar a aplicação.');
    console.log(`  URL Direta: http://localhost:3000/setup?key=${cachedSetupKey}`);
    console.log('===================================================================\n');
  }

  return cachedSetupKey;
}

/**
 * Valida de forma segura em tempo constante se a chave fornecida é equivalente à chave ativa.
 */
export function validateSetupKey(providedKey?: string | null): boolean {
  if (!providedKey || typeof providedKey !== 'string') {
    return false;
  }

  const activeKey = getOrCreateSetupKey();

  const userBuffer = Buffer.from(providedKey.trim());
  const activeBuffer = Buffer.from(activeKey.trim());

  if (userBuffer.length !== activeBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(userBuffer, activeBuffer);
}

/**
 * Remove o arquivo de chave temporária e reseta os caches de memória após o setup.
 */
export function clearSetupKey(): void {
  cachedSetupKey = null;
  hasLoggedSetupKey = false;
  try {
    if (fs.existsSync(SETUP_KEY_FILE)) {
      fs.unlinkSync(SETUP_KEY_FILE);
      console.log('[AniStream Security] 🔒 Chave de instalação temporária destruída com sucesso.');
    }
  } catch {
    // Ignorar erros na deleção
  }
}
