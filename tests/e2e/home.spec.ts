import { test, expect } from '@playwright/test';

test.describe('AniStream - Home Page & Navigation', () => {
  test('deve carregar a página inicial com título e elementos visuais', async ({ page }) => {
    await page.goto('/');

    // Verificar se o título ou a marca AniStream estão presentes
    await expect(page).toHaveTitle(/AniStream/i);
    await expect(page.getByRole('link', { name: 'AniStream — início' })).toBeVisible();

    // Verificar links da Navbar
    await expect(page.getByRole('link', { name: 'Populares', exact: true })).toBeVisible();
    await expect(page.locator('a:has-text("Catálogo")').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filmes', exact: true })).toBeVisible();
    await expect(page.locator('[data-homepage-source="published"]')).toBeVisible();
  });

  test('deve navegar para a página de animes populares', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Populares")');
    await expect(page).toHaveURL(/\/populares/);
  });
});
