import { expect, test } from '@playwright/test';

test.describe('Qualidade visual do catálogo', () => {
  test('serve favicon e ícones PWA', async ({ request }) => {
    for (const asset of ['/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.json']) {
      const response = await request.get(asset);
      expect(response.ok(), `${asset} deveria responder 200`).toBeTruthy();
    }

    const manifest = await (await request.get('/manifest.json')).json();
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icon-512.png', sizes: '512x512' }),
    ]));
  });

  test('mostra skeleton enquanto o catálogo aguarda a API', async ({ page }) => {
    await page.route('**/api/anime/search**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });

    await page.goto('/lista');
    const busyContainer = page.locator('[aria-busy="true"]').last();
    await expect(busyContainer).toBeVisible();
    await expect(busyContainer.locator('.animate-pulse').first()).toBeVisible();
  });

  test('cards usam lazy loading e o hero usa prioridade', async ({ page }) => {
    await page.goto('/lista');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('img[loading="lazy"]').first()).toBeAttached();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('img[fetchpriority="high"]').first()).toBeAttached();
  });

  test('home não renderiza tags HTML nas sinopses e não cria overflow horizontal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/<\/?(?:i|b|br|p|ul|li)(?:\s|>)/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('episódio não resolve Kenjitsu antes do clique em reproduzir', async ({ page }) => {
    let resolveRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/streams/resolve')) resolveRequests += 1;
    });

    await page.goto('/anime/16498/episode/1');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    expect(resolveRequests).toBe(0);
    await expect(page.getByRole('link', { name: /Episódio Anterior/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Reproduzir episódio/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /Reproduzir episódio/i }).first().click();
    await expect.poll(() => resolveRequests, { timeout: 5000 }).toBeGreaterThan(0);
  });
});
