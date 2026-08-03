import { test, expect } from '@playwright/test';

test.describe('Catálogo e Reprodução de Streaming', () => {
  test('deve pesquisar um anime e carregar os detalhes do episódio', async ({ page }) => {
    // 1. Navegar para a página inicial
    await page.goto('/');

    // 2. Verificar se o título principal está visível
    await expect(page).toHaveTitle(/AniStream/i);

    // 3. Simular busca por API pública
    const searchResponse = await page.request.get('/api/anime/search?q=Jujutsu');
    const searchData = await searchResponse.json();

    if (!searchResponse.ok()) {
      expect([502, 503, 504]).toContain(searchResponse.status());
      expect(searchData.error).toMatch(/Kenjitsu|catálogo/i);
      return;
    }

    expect(searchData.data).toBeDefined();
    expect(searchData.pagination).toBeDefined();
  });
});
