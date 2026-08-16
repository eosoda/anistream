import { test, expect } from '@playwright/test';
import { signInAdmin } from './admin-session';

const routeCases = [
  { path: '/admin', expected: '/admin' },
  { path: '/admin/dashboard', expected: '/admin' },
  { path: '/admin/animes', expected: '/admin/animes' },
  { path: '/admin/animes/novo', expected: '/admin/animes/novo' },
  { path: '/admin/animes/does-not-exist/editar', expected: '/admin/animes/does-not-exist/editar' },
  { path: '/admin/extensions', expected: '/admin/extensions' },
  { path: '/admin/homepage', expected: '/admin/homepage' },
  { path: '/admin/sources', expected: '/admin/extensions' },
  { path: '/admin/sources/tester', expected: '/admin/extensions' },
  { path: '/admin/navigation', expected: '/admin/navigation' },
  { path: '/admin/calendar', expected: '/admin/calendar' },
  { path: '/admin/system', expected: '/admin/system' },
  { path: '/admin/backups', expected: '/admin/backups' },
  { path: '/admin/integrations', expected: '/admin/integrations' },
  { path: '/admin/broadcasts', expected: '/admin/broadcasts' },
  { path: '/admin/releases', expected: '/admin/releases' },
];

test.describe('Painel administrativo operacional', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
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

  test('redireciona login bem-sucedido para a visão geral do painel', async ({ page }) => {
    await page.route('**/api/admin/login', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.goto('/admin/login');
    await page.locator('#admin-email').fill('admin@example.com');
    await page.locator('#admin-password').fill('password-123456');
    await page.getByRole('button', { name: 'Entrar no Painel' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('testa extensões selecionadas em sequência', async ({ page }) => {
    let inFlight = 0;
    let maxInFlight = 0;
    const testedIds: string[] = [];

    await page.route('**/api/admin/extensions', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      const body = route.request().postDataJSON() as { id: string };
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      testedIds.push(body.id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 'healthy', latencyMs: 12 }) });
      inFlight -= 1;
    });

    await page.goto('/admin/extensions');
    await page.waitForLoadState('networkidle');
    await page.getByRole('checkbox', { name: 'Selecionar anizone' }).check();
    await page.getByRole('checkbox', { name: 'Selecionar anikoto' }).check();
    await page.getByRole('button', { name: 'Testar extensões selecionadas em sequência' }).click();

    await expect(page.getByText(/Testes concluídos:/)).toBeVisible();
    expect(testedIds).toEqual(['anizone', 'anikoto']);
    expect(maxInFlight).toBe(1);
  });

  test('mantém espaço para a lupa nos filtros de busca administrativos', async ({ page }) => {
    const searchFields = [
      { path: '/admin/extensions', placeholder: 'Nome ou identificador' },
      { path: '/admin/animes', placeholder: 'Título, título original ou slug' },
    ];

    for (const field of searchFields) {
      await page.goto(field.path);
      await page.waitForLoadState('networkidle');
      const input = page.getByPlaceholder(field.placeholder, { exact: true });
      await expect(input).toHaveClass(/admin-search-input/);
      await expect.poll(async () => input.evaluate((element) => getComputedStyle(element).paddingLeft)).toBe('36px');
    }
  });

  test('renderiza o preview protegido da Home publicada', async ({ page }) => {
    await page.goto('/preview/homepage');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/preview\/homepage$/);
    await expect(page.locator('[data-homepage-source="draft"]')).toBeVisible();
  });

  test('carrega o construtor com canvas e inspector', async ({ page }) => {
    await page.goto('/admin/homepage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Construtor da Home' })).toBeVisible();
    await expect(page.getByText('Blocos da Home', { exact: true })).toBeVisible();
    await expect(page.getByText('Inspector', { exact: true })).toBeVisible();
    await expect(page.getByText('Prévia local', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir prévia' })).toBeVisible();
    await expect(page.locator('[aria-label="Blocos ordenáveis da Home"]')).toBeVisible();
  });

  test('exibe o histórico de snapshots da Home e abre uma composição', async ({ page }) => {
    await page.goto('/admin/homepage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Snapshots da Home' })).toBeVisible();
    const snapshots = page.getByTestId('homepage-snapshots');
    await expect(snapshots).toBeVisible();
    const viewButton = snapshots.getByRole('button', { name: /Ver Publicada v\d+/ }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    const drawer = page.getByRole('dialog', { name: /Publicada v\d+/ });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Composição preservada', { exact: true })).toBeVisible();
    await drawer.getByRole('button', { name: 'Fechar painel' }).click();
    await expect(drawer).toBeHidden();
  });

  test('permite excluir snapshots antigos e protege a publicação atual', async ({ page }) => {
    await page.goto('/admin/homepage');
    await page.waitForLoadState('networkidle');
    const snapshots = page.getByTestId('homepage-snapshots');
    await expect(snapshots.getByText('Protegida', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Criar snapshot do rascunho' }).click();
    await expect(page.getByText(/disponível no histórico/)).toBeVisible();

    const deleteButton = snapshots.locator('button[aria-label^="Excluir Rascunho v"]');
    await expect(deleteButton).toHaveCount(1);
    await deleteButton.click();

    const dialog = page.getByRole('alertdialog', { name: /Excluir Rascunho v/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Excluir snapshot', exact: true }).click();

    await expect(page.getByText(/foi excluído do histórico/)).toBeVisible();
    await expect(deleteButton).toHaveCount(0);
    await expect(snapshots.getByText('Protegida', { exact: true })).toBeVisible();
  });

  test('mantém espaçamento interno no inspector da Home', async ({ page }) => {
    await page.goto('/admin/homepage');
    await page.waitForLoadState('networkidle');
    const inspector = page.locator('.admin-panel').filter({ hasText: 'Inspector' });
    await expect(inspector).toHaveCount(1);
    const panelBox = await inspector.boundingBox();
    const firstFieldBox = await inspector.locator('select').first().boundingBox();
    if (!panelBox || !firstFieldBox) throw new Error('Não foi possível medir o corpo do Inspector.');
    expect(firstFieldBox.x - panelBox.x).toBeGreaterThanOrEqual(16);
  });

  test('mantem espacamento interno no preview de navegacao', async ({ page }) => {
    await page.goto('/admin/navigation');
    await page.waitForLoadState('networkidle');
    const previewPanel = page.locator('.admin-panel').filter({ hasText: 'Como a configuração' });
    await expect(previewPanel).toHaveCount(1);
    const panelBox = await previewPanel.boundingBox();
    const desktopLabel = previewPanel.getByText('Desktop', { exact: true });
    await expect(desktopLabel).toBeVisible();
    const labelBox = await desktopLabel.boundingBox();
    if (!panelBox || !labelBox) throw new Error('Não foi possível medir o preview de navegação.');
    expect(labelBox.x - panelBox.x).toBeGreaterThanOrEqual(16);
  });

  test('mantem espacamento interno na pre-visualizacao do calendario', async ({ page }) => {
    await page.goto('/admin/calendar');
    await page.waitForLoadState('networkidle');
    const previewPanel = page.locator('.admin-panel').filter({ hasText: 'Grade da semana' });
    await expect(previewPanel).toHaveCount(1);
    const panelBox = await previewPanel.boundingBox();
    const firstDay = previewPanel.locator('section').first();
    await expect(firstDay).toBeVisible();
    const dayBox = await firstDay.boundingBox();
    if (!panelBox || !dayBox) throw new Error('Não foi possível medir a prévia do calendário.');
    expect(dayBox.x - panelBox.x).toBeGreaterThanOrEqual(16);
  });

  test('renderiza o calendário público sem expor episódio', async ({ page }) => {
    await page.goto('/calendario');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Calendário semanal' })).toBeVisible();
    await expect(page.getByText(/episódio/i)).toHaveCount(0);
  });
});
