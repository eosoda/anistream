import { test, expect } from '@playwright/test';

test.describe('AniStream - Home Page & Navigation', () => {
  test('deve carregar a página inicial com título e elementos visuais', async ({ page }) => {
    await page.goto('/');

    // Verificar se o título ou a marca AniStream estão presentes
    await expect(page).toHaveTitle(/AniStream/i);
    await expect(page.locator('text=ANISTREAM')).toBeVisible();

    // Verificar links da Navbar
    await expect(page.locator('a:has-text("Populares")')).toBeVisible();
    await expect(page.locator('a:has-text("Temporadas")')).toBeVisible();
    await expect(page.locator('a:has-text("Filmes")')).toBeVisible();
  });

  test('deve navegar para a página de animes populares', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Populares")');
    await expect(page).toHaveURL(/\/populares/);
  });
});
