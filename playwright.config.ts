import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  // A sessão administrativa real é compartilhada por arquivo. Manter um
  // worker evita que a proteção de login seja confundida com concorrência de
  // teste e mantém o banco E2E determinístico.
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
