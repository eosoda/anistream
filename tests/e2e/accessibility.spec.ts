import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

function adminToken() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const match = readFileSync('.env', 'utf8').match(/^ADMIN_SESSION_SECRET=["']?([^"'\r\n]+)["']?/m);
  if (!match) throw new Error('ADMIN_SESSION_SECRET é necessário para os testes administrativos.');
  return match[1];
}

async function authenticateAdmin(page: import('@playwright/test').Page) {
  await page.context().addCookies([
    { name: 'admin_token', value: adminToken(), url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
  ]);
}

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`home sem violações graves em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

for (const path of ['/pesquisa?q=frieren', '/admin/login', '/anime/52991', '/anime/52991/episode/1', '/lista/importar', '/filmes']) {
  test(`${path} sem violações graves`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
}

test('formulários administrativos não têm violações graves', async ({ page }) => {
  await authenticateAdmin(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/admin/animes/novo', '/admin/sources/tester', '/admin/navigation', '/admin/homepage']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
});

test('confirmação de restore prende e restaura foco', async ({ page }) => {
  await authenticateAdmin(page);
  await page.goto('/admin/backups');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.focus();
  await fileInput.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  const dialog = page.getByRole('alertdialog', { name: /restaurar este backup/i });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.locator('aside').evaluate((element) => Boolean(element.closest('[inert]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(fileInput).toBeFocused();
  await fileInput.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(dialog).toBeVisible();
});
