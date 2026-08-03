import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

function adminToken() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const match = readFileSync('.env', 'utf8').match(/^ADMIN_SESSION_SECRET=["']?([^"'\r\n]+)["']?/m);
  if (!match) throw new Error('ADMIN_SESSION_SECRET é necessário para os testes administrativos.');
  return match[1];
}

test.describe('Centro operacional de navegação', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'admin_token', value: adminToken(), url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000' },
    ]);
  });

  test('carrega destinos oficiais, preview e as três áreas configuráveis', async ({ page }) => {
    await page.goto('/admin/navigation');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Navegação' })).toBeVisible();
    await expect(page.getByText(/Menu público \(7\)/)).toBeVisible();
    await expect(page.getByText('Preview operacional')).toBeVisible();

    await page.getByRole('tab', { name: /Atalhos mobile/ }).click();
    await expect(page.getByText('Slot 1')).toBeVisible();
    await expect(page.getByText(/busca permanece fixa/i)).toBeVisible();

    await page.getByRole('tab', { name: /Páginas \(6\)/ }).click();
    await expect(page.getByText('Páginas e redirects')).toBeVisible();
    await expect(page.getByText('Destino após desativação').first()).toBeVisible();
  });

  test('mantém dirty state e descarta alteração local sem publicar', async ({ page }) => {
    await page.goto('/admin/navigation');
    await page.waitForLoadState('networkidle');
    const label = page.locator('input').first();
    const original = await label.inputValue();
    await label.fill(`${original} teste`);
    await expect(page.locator('.admin-save-bar')).toBeVisible();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(label).toHaveValue(original);
    await expect(page.locator('.admin-save-bar')).toBeHidden();
  });

  test('aplica a configuração pública na Navbar, mobile e footer', async ({ page }) => {
    await page.route('**/api/settings/public', async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      const data = payload.data as { navigation: Array<{ id: string; label: string; enabled: boolean }>; mobileBottomIds: string[] };
      data.navigation.find((item) => item.id === 'popular')!.label = 'Em alta';
      data.navigation.find((item) => item.id === 'movies')!.enabled = false;
      data.mobileBottomIds = ['popular', 'calendar', 'favorites'];
      await route.fulfill({ response, body: JSON.stringify(payload) });
    });

    await page.goto('/');
    await expect(page.locator('header nav a[href="/populares"]')).toHaveText('Em alta');
    await expect(page.getByRole('contentinfo').locator('a[href="/filmes"]')).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.locator('nav').filter({ has: page.locator('a[href="/pesquisa"]') });
    await expect(mobileNav.locator('a[href="/populares"]')).toBeVisible();
    await expect(mobileNav.locator('a[href="/pesquisa"]')).toBeVisible();
    await expect(mobileNav.locator('a[href="/calendario"]')).toBeVisible();
    await expect(mobileNav.locator('a[href="/favoritos"]')).toBeVisible();
  });

  test('redireciona página desativada e mostra o aviso acessível', async ({ page }) => {
    await page.route('**/api/settings/public', async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      const movies = (payload.data.pages as Array<{ id: string; enabled: boolean; redirectHref: string; disabledMessage: string }>).find((item) => item.id === 'movies')!;
      movies.enabled = false;
      movies.redirectHref = '/';
      movies.disabledMessage = 'Filmes bloqueados no teste.';
      await route.fulfill({ response, body: JSON.stringify(payload) });
    });

    await page.goto('/filmes');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Filmes bloqueados no teste.')).toBeVisible();
  });
});
