import { test, expect } from '@playwright/test';

test.describe('AniStream - Meus Favoritos & Backup', () => {
  test('deve carregar a página de favoritos e exibir os botões de backup JSON', async ({ page }) => {
    await page.goto('/favoritos');

    // Verificar título principal
    await expect(page.locator('h1')).toContainText('Meus Animes Favoritos');

    // Verificar botões de exportação e importação
    await expect(page.locator('button:has-text("Exportar JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Importar JSON")')).toBeVisible();
  });
});
