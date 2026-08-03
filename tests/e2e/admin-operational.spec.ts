import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

function adminToken() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const match = readFileSync('.env', 'utf8').match(/^ADMIN_SESSION_SECRET=["']?([^"'\r\n]+)["']?/m);
  if (!match) throw new Error('ADMIN_SESSION_SECRET é necessário para os testes administrativos.');
  return match[1];
}

const routeCases = [
  { path: '/admin', expected: '/admin' },
  { path: '/admin/dashboard', expected: '/admin' },
  { path: '/admin/animes', expected: '/admin/animes' },
  { path: '/admin/animes/novo', expected: '/admin/animes/novo' },
  { path: '/admin/animes/does-not-exist/editar', expected: '/admin/animes/does-not-exist/editar' },
  { path: '/admin/extensions', expected: '/admin/extensions' },
  { path: '/admin/sources', expected: '/admin/extensions' },
  { path: '/admin/sources/tester', expected: '/admin/extensions' },
  { path: '/admin/navigation', expected: '/admin/navigation' },
  { path: '/admin/system', expected: '/admin/system' },
  { path: '/admin/backups', expected: '/admin/backups' },
  { path: '/admin/integrations', expected: '/admin/integrations' },
  { path: '/admin/broadcasts', expected: '/admin/broadcasts' },
  { path: '/admin/releases', expected: '/admin/releases' },
];

test.describe('Painel administrativo operacional', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'admin_token', value: adminToken(), url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
    ]);
  });

  for (const routeCase of routeCases) {
    test(`renderiza ${routeCase.path}`, async ({ page }) => {
      await page.goto(routeCase.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(`${routeCase.expected.replaceAll('/', '\\/')}(?:\\?.*)?$`));
      await expect(page.locator('main.admin-main')).toBeVisible();
      await expect(page.getByText('Application error', { exact: false })).toHaveCount(0);
    });
  }

  test('abre e fecha a command palette por teclado', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('ControlOrMeta+KeyK');
    await expect(page.getByRole('dialog', { name: 'Navegação administrativa' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Navegação administrativa' })).toBeHidden();
  });
});
