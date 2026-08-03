import { z } from 'zod';
import type { ConfigurablePageId, NavigationConfigDocument, NavDestinationId } from '@/types/navigation';
import { CONFIGURABLE_PAGE_IDS, NAVIGATION_DESTINATION_IDS, getNavigationDestination, isConfigurablePageId, isNavigationDestinationId } from '@/lib/navigation/registry';

const NavigationItemSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, 'O rótulo é obrigatório.').max(40, 'O rótulo deve ter no máximo 40 caracteres.'),
  href: z.string(),
  enabled: z.boolean(),
  order: z.number().int().min(1).max(20),
});

const PageFeatureSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
  href: z.string(),
  enabled: z.boolean(),
  redirectHref: z.string(),
  disabledMessage: z.string().trim().min(1).max(300),
});

const MobileBottomIdsSchema = z.tuple([z.string(), z.string(), z.string()]);

function validateShared(value: {
  navigation: Array<{ id: string; href: string; enabled: boolean; order: number }>;
  mobileBottomIds: [string, string, string];
  pages: Array<{ id: string; href: string; enabled: boolean; redirectHref: string }>;
}, context: z.RefinementCtx) {
  const navigationIds = value.navigation.map((item) => item.id);
  const pageIds = value.pages.map((page) => page.id);
  const navigationSet = new Set(navigationIds);
  const pageSet = new Set(pageIds);

  if (navigationSet.size !== navigationIds.length || navigationIds.length !== NAVIGATION_DESTINATION_IDS.length || !NAVIGATION_DESTINATION_IDS.every((id) => navigationSet.has(id))) {
    context.addIssue({ code: 'custom', path: ['navigation'], message: 'A lista deve conter exatamente os destinos oficiais, sem duplicidades.' });
  }
  if (pageSet.size !== pageIds.length || pageIds.length !== CONFIGURABLE_PAGE_IDS.length || !CONFIGURABLE_PAGE_IDS.every((id) => pageSet.has(id))) {
    context.addIssue({ code: 'custom', path: ['pages'], message: 'Todas as páginas públicas configuráveis precisam estar presentes.' });
  }

  const orders = value.navigation.map((item) => item.order);
  if (new Set(orders).size !== orders.length) context.addIssue({ code: 'custom', path: ['navigation'], message: 'A ordem dos destinos não pode se repetir.' });

  value.navigation.forEach((item, index) => {
    if (!isNavigationDestinationId(item.id)) {
      context.addIssue({ code: 'custom', path: ['navigation', index, 'id'], message: 'Destino de navegação inválido.' });
      return;
    }
    const destination = getNavigationDestination(item.id);
    if (destination && item.href !== destination.href) context.addIssue({ code: 'custom', path: ['navigation', index, 'href'], message: 'A rota deve ser a rota oficial do destino.' });
  });

  const enabledIds = new Set(value.navigation.filter((item) => item.enabled).map((item) => item.id));
  const pageById = new Map(value.pages.map((page) => [page.id, page]));
  const mobileSet = new Set(value.mobileBottomIds);
  if (mobileSet.size !== 3) context.addIssue({ code: 'custom', path: ['mobileBottomIds'], message: 'Escolha três destinos diferentes para os atalhos mobile.' });
  value.mobileBottomIds.forEach((id, index) => {
    if (!isNavigationDestinationId(id) || !enabledIds.has(id)) context.addIssue({ code: 'custom', path: ['mobileBottomIds', index], message: 'Os atalhos mobile precisam ser destinos habilitados.' });
    if (id !== 'home') {
      const page = pageById.get(id);
      if (page && !page.enabled) context.addIssue({ code: 'custom', path: ['mobileBottomIds', index], message: 'Uma página desativada não pode ocupar um atalho mobile.' });
    }
  });

  const disabledHrefs = new Set(value.pages.filter((page) => !page.enabled).map((page) => page.href));
  value.pages.forEach((page, index) => {
    if (!isConfigurablePageId(page.id)) {
      context.addIssue({ code: 'custom', path: ['pages', index, 'id'], message: 'Página pública inválida.' });
      return;
    }
    const destination = getNavigationDestination(page.id);
    if (destination && page.href !== destination.href) context.addIssue({ code: 'custom', path: ['pages', index, 'href'], message: 'A rota da página deve ser a rota oficial.' });
    const redirectTarget = page.redirectHref === '/' ? '/' : getNavigationDestination(page.redirectHref)?.href;
    if (!redirectTarget) context.addIssue({ code: 'custom', path: ['pages', index, 'redirectHref'], message: 'Escolha um destino interno válido.' });
    if (!page.enabled && redirectTarget && disabledHrefs.has(redirectTarget)) context.addIssue({ code: 'custom', path: ['pages', index, 'redirectHref'], message: 'O redirect não pode apontar para outra página desativada.' });
    if (!page.enabled && redirectTarget === page.href) context.addIssue({ code: 'custom', path: ['pages', index, 'redirectHref'], message: 'A página não pode redirecionar para ela mesma.' });
  });
}

export const NavigationSaveSchema = z.object({
  navigation: z.array(NavigationItemSchema).length(NAVIGATION_DESTINATION_IDS.length),
  mobileBottomIds: MobileBottomIdsSchema,
  pages: z.array(PageFeatureSchema).length(CONFIGURABLE_PAGE_IDS.length),
  expectedRevision: z.number().int().min(1),
}).superRefine(validateShared);

export const NavigationDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  revision: z.number().int().min(1),
  navigation: z.array(NavigationItemSchema).length(NAVIGATION_DESTINATION_IDS.length),
  mobileBottomIds: MobileBottomIdsSchema,
  pages: z.array(PageFeatureSchema).length(CONFIGURABLE_PAGE_IDS.length),
}).superRefine(validateShared);

export type NavigationSaveInput = z.infer<typeof NavigationSaveSchema>;

export function parseNavigationDocument(value: unknown): NavigationConfigDocument {
  return NavigationDocumentSchema.parse(value) as NavigationConfigDocument;
}

export function parseNavigationSave(value: unknown): NavigationSaveInput {
  return NavigationSaveSchema.parse(value);
}
