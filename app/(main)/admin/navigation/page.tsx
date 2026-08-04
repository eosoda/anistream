'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Calendar, Check, Film, Flame, Heart, Home, Layout, ListFilter, Loader2, Search, Save, Smartphone, Eye, EyeOff } from 'lucide-react';
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar, AdminStatusBadge } from '@/components/admin';
import { NavigationSaveSchema } from '@/schemas/navigation';
import { buildNavigationPreview } from '@/lib/navigation/presentation';
import { getNavigationDestination, NAVIGATION_DESTINATIONS } from '@/lib/navigation/registry';
import type { ConfigurablePageId, NavigationConfigDocument, NavigationPreview, NavDestinationId, NavItemConfig, PageFeatureConfig } from '@/types/navigation';

type TabId = 'menu' | 'mobile' | 'pages';
type Feedback = { tone: 'success' | 'danger' | 'warning'; message: string };

const iconMap = { home: Home, popular: Flame, seasons: Calendar, calendar: Calendar, movies: Film, catalog: ListFilter, favorites: Heart } as const;

function configFromResponse(data: any): NavigationConfigDocument {
  return {
    schemaVersion: 2,
    revision: Number(data.revision) || 1,
    navigation: Array.isArray(data.navigation) ? data.navigation.slice().sort((a: NavItemConfig, b: NavItemConfig) => a.order - b.order) : [],
    mobileBottomIds: Array.isArray(data.mobileBottomIds) ? data.mobileBottomIds as NavigationConfigDocument['mobileBottomIds'] : ['home', 'catalog', 'favorites'],
    pages: Array.isArray(data.pages) ? data.pages : [],
  };
}

function validationIssues(state: NavigationConfigDocument) {
  const result = NavigationSaveSchema.safeParse({ ...state, expectedRevision: state.revision });
  return result.success ? [] : result.error.issues;
}

function hasIssue(issues: ReturnType<typeof validationIssues>, ...path: Array<string | number>) {
  return issues.some((issue) => path.every((part, index) => issue.path[index] === part));
}

function NavigationIcon({ item, size = 18 }: { item: NavItemConfig; size?: number }) {
  const Icon = iconMap[item.id];
  return <Icon size={size} aria-hidden="true" />;
}

function PreviewItem({ item }: { item: NavigationPreview['mobileBottom'][number] }) {
  if (item.id === 'search') return <span className="flex min-h-10 items-center gap-2 border border-dashed border-[var(--admin-line-strong)] px-3 text-xs text-[var(--admin-muted)]"><Search size={15} aria-hidden="true" />{item.label}</span>;
  return <span className="flex min-h-10 items-center gap-2 border border-[var(--admin-line)] bg-[var(--admin-panel-raised)] px-3 text-xs font-semibold text-[var(--admin-text)]"><NavigationIcon item={item} size={15} />{item.label}</span>;
}

function NavigationPreviewPanel({ preview }: { preview: NavigationPreview }) {
  return <AdminPanel>
    <div className="admin-panel-header"><div><p className="admin-eyebrow">Preview operacional</p><h2 className="admin-section-title">Como a configuração será publicada</h2><p className="admin-section-description">Itens desativados ou bloqueados por uma página indisponível não aparecem para visitantes.</p></div><Eye size={19} className="text-[#FF6B00]" aria-hidden="true" /></div>
    <div className="space-y-4 p-4 sm:p-5">
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-dim)]">Desktop</p><div className="flex flex-wrap gap-2" aria-label="Preview da navegação desktop">{preview.desktop.length ? preview.desktop.map((item) => <PreviewItem key={item.id} item={item} />) : <span className="text-xs text-[var(--admin-dim)]">Nenhum destino visível.</span>}</div></div>
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-dim)]">Mobile · busca fixa</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Preview da navegação mobile">{preview.mobileBottom.map((item, index) => <PreviewItem key={`${item.id}-${index}`} item={item} />)}</div></div>
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-dim)]">Menu Mais</p><div className="flex flex-wrap gap-2">{preview.mobileMore.length ? preview.mobileMore.map((item) => <PreviewItem key={item.id} item={item} />) : <span className="text-xs text-[var(--admin-dim)]">Todos os destinos estão na barra mobile.</span>}</div></div>
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-dim)]">Footer · Navegação</p><div className="flex flex-wrap gap-2">{preview.footer.map((item) => <PreviewItem key={item.id} item={item} />)}</div></div>
    </div>
  </AdminPanel>;
}

export default function AdminNavigationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('menu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<NavigationConfigDocument | null>(null);
  const [savedState, setSavedState] = useState<NavigationConfigDocument | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/navigation', { signal, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível carregar a navegação.');
      const next = configFromResponse(payload.data);
      setState(next);
      setSavedState(next);
      setFeedback(null);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao carregar a navegação.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // A carga inicial sincroniza a tela com a fonte administrativa externa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const issues = useMemo(() => state ? validationIssues(state) : [], [state]);
  const dirty = Boolean(state && savedState && JSON.stringify(state) !== JSON.stringify(savedState));
  const preview = useMemo(() => state ? buildNavigationPreview(state) : null, [state]);

  const updateNavigation = (id: NavDestinationId, update: Partial<NavItemConfig>) => setState((current) => current ? { ...current, navigation: current.navigation.map((item) => item.id === id ? { ...item, ...update } : item) } : current);

  const moveNavigation = (index: number, direction: -1 | 1) => setState((current) => {
    if (!current) return current;
    const target = index + direction;
    if (target < 0 || target >= current.navigation.length) return current;
    const navigation = current.navigation.slice();
    [navigation[index], navigation[target]] = [navigation[target], navigation[index]];
    return { ...current, navigation: navigation.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) };
  });

  const setMobileSlot = (slot: number, id: NavDestinationId) => setState((current) => {
    if (!current) return current;
    const mobileBottomIds = current.mobileBottomIds.slice() as NavigationConfigDocument['mobileBottomIds'];
    mobileBottomIds[slot] = id;
    return { ...current, mobileBottomIds };
  });

  const toggleNavigation = (item: NavItemConfig) => setState((current) => {
    if (!current) return current;
    const enabled = !item.enabled;
    const navigation = current.navigation.map((candidate) => candidate.id === item.id ? { ...candidate, enabled } : candidate);
    if (!enabled && current.mobileBottomIds.includes(item.id)) {
      const replacement = navigation.find((candidate) => candidate.enabled && !current.mobileBottomIds.includes(candidate.id) && candidate.id !== item.id && current.pages.find((page) => page.id === candidate.id)?.enabled !== false);
      if (replacement) {
        const mobileBottomIds = current.mobileBottomIds.map((id) => id === item.id ? replacement.id : id) as NavigationConfigDocument['mobileBottomIds'];
        return { ...current, navigation, mobileBottomIds };
      }
    }
    return { ...current, navigation };
  });

  const togglePage = (page: PageFeatureConfig) => setState((current) => {
    if (!current) return current;
    const enabled = !page.enabled;
    const pages = current.pages.map((candidate) => candidate.id === page.id ? { ...candidate, enabled } : candidate);
    if (!enabled && current.mobileBottomIds.includes(page.id)) {
      const replacement = current.navigation.find((candidate) => candidate.enabled && !current.mobileBottomIds.includes(candidate.id) && candidate.id !== page.id && (candidate.id === 'home' || pages.find((candidatePage) => candidatePage.id === candidate.id)?.enabled !== false));
      if (replacement) return { ...current, pages, mobileBottomIds: current.mobileBottomIds.map((id) => id === page.id ? replacement.id : id) as NavigationConfigDocument['mobileBottomIds'] };
    }
    return { ...current, pages };
  });
  const updatePage = (id: ConfigurablePageId, update: Partial<PageFeatureConfig>) => setState((current) => current ? { ...current, pages: current.pages.map((page) => page.id === id ? { ...page, ...update } : page) } : current);

  const save = async () => {
    if (!state) return;
    if (issues.length) {
      setFeedback({ tone: 'danger', message: issues[0]?.message || 'Revise os campos destacados antes de publicar.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/navigation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ navigation: state.navigation, mobileBottomIds: state.mobileBottomIds, pages: state.pages, expectedRevision: state.revision }) });
      const payload = await response.json();
      if (response.status === 409) {
        setFeedback({ tone: 'warning', message: 'A configuração mudou em outra sessão. Recarregue os dados antes de publicar suas alterações.' });
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Falha ao publicar a navegação.');
      const next = configFromResponse(payload.data);
      setState(next);
      setSavedState(next);
      setFeedback({ tone: 'success', message: 'Navegação publicada e registrada na auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao publicar a navegação.' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!savedState) return;
    setState(savedState);
    setFeedback({ tone: 'success', message: 'Alterações locais descartadas.' });
  };

  if (loading && !state) return <div className="admin-empty-state min-h-[420px]" aria-live="polite"><Loader2 size={24} className="animate-spin text-[#FF6B00]" aria-hidden="true" /><h2>Carregando navegação</h2><p>Consultando os destinos publicados e as regras de disponibilidade.</p></div>;
  if (!state || !preview) return <AdminEmptyState title="Navegação indisponível" description="Não foi possível carregar a configuração pública." action={<button type="button" className="admin-button is-primary" onClick={() => void load()}>Tentar novamente</button>} />;

  const tabs = [
    { id: 'menu' as const, label: `Menu público (${state.navigation.length})`, icon: Layout },
    { id: 'mobile' as const, label: 'Atalhos mobile', icon: Smartphone },
    { id: 'pages' as const, label: `Páginas (${state.pages.length})`, icon: EyeOff },
  ];

  return <div className="space-y-5 pb-28">
    <AdminPageHeader eyebrow="Gerenciar / Experiência" title="Navegação" description="Controle os destinos públicos, os atalhos mobile e a disponibilidade de cada área sem editar código." breadcrumbs={[{ label: 'Navegação' }]} actions={<div className="flex flex-wrap gap-2"><Link href="/" target="_blank" className="admin-button is-ghost">Abrir site</Link><button type="button" className="admin-button is-primary" onClick={() => void save()} disabled={saving || !dirty || issues.length > 0}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Publicar</button></div>} />
    {feedback && <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</AdminFeedback>}

    <div className="grid gap-3 sm:grid-cols-4">
      <AdminPanel className="p-4"><p className="admin-eyebrow">Destinos</p><p className="mt-1 text-2xl font-black text-[var(--admin-text)]">{state.navigation.length}</p><p className="text-xs text-[var(--admin-dim)]">rotas oficiais</p></AdminPanel>
      <AdminPanel className="p-4"><p className="admin-eyebrow">Publicados</p><p className="mt-1 text-2xl font-black text-emerald-300">{preview.desktop.length}</p><p className="text-xs text-[var(--admin-dim)]">visíveis no desktop</p></AdminPanel>
      <AdminPanel className="p-4"><p className="admin-eyebrow">Mobile</p><p className="mt-1 text-2xl font-black text-[#FF9A5B]">3 + busca</p><p className="text-xs text-[var(--admin-dim)]">atalhos na barra inferior</p></AdminPanel>
      <AdminPanel className="p-4"><p className="admin-eyebrow">Revisão</p><p className="mt-1 font-mono text-2xl font-black text-[var(--admin-text)]">v{state.revision}</p><p className="text-xs text-[var(--admin-dim)]">última publicação</p></AdminPanel>
    </div>

    <div className="flex flex-wrap gap-2 border-b border-[var(--admin-line)] pb-3" role="tablist" aria-label="Configurações da experiência pública">
      {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} id={`navigation-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`navigation-panel-${tab.id}`} className={`admin-button ${activeTab === tab.id ? 'is-primary' : 'is-ghost'}`} onClick={() => setActiveTab(tab.id)}><Icon size={15} aria-hidden="true" />{tab.label}</button>; })}
    </div>

    <div id={`navigation-panel-${activeTab}`} role="tabpanel" aria-labelledby={`navigation-tab-${activeTab}`}>
      {activeTab === 'menu' && <AdminPanel>
        <div className="admin-panel-header"><div><p className="admin-eyebrow">Lista oficial</p><h2 className="admin-section-title">Menu público</h2><p className="admin-section-description">Os destinos são fixos para manter URLs internas seguras; você controla rótulo, ordem e visibilidade.</p></div><span className="font-mono text-[11px] text-[var(--admin-dim)]">{preview.desktop.length} visíveis</span></div>
        <div className="hidden overflow-x-auto md:block"><table className="admin-table"><thead><tr><th scope="col">Ordem</th><th scope="col">Destino</th><th scope="col">Rótulo publicado</th><th scope="col">Rota</th><th scope="col">Estado</th></tr></thead><tbody>{state.navigation.map((item, index) => <tr key={item.id}><td><div className="flex items-center gap-1"><span className="w-6 font-mono text-xs text-[var(--admin-dim)]">{item.order}</span><button type="button" className="admin-icon-button" onClick={() => moveNavigation(index, -1)} disabled={index === 0} aria-label={`Mover ${item.label} para cima`}><ArrowUp size={14} /></button><button type="button" className="admin-icon-button" onClick={() => moveNavigation(index, 1)} disabled={index === state.navigation.length - 1} aria-label={`Mover ${item.label} para baixo`}><ArrowDown size={14} /></button></div></td><td><span className="inline-flex items-center gap-2 font-semibold text-[var(--admin-text)]"><NavigationIcon item={item} size={16} />{getNavigationDestination(item.id)?.defaultLabel}</span></td><td><label className="admin-field-group"><span className="sr-only">Rótulo de {item.label}</span><input className="admin-field min-w-40" value={item.label} onChange={(event) => updateNavigation(item.id, { label: event.target.value })} aria-invalid={hasIssue(issues, 'navigation', index, 'label')} /></label></td><td><code className="text-xs text-[var(--admin-dim)]">{item.href}</code></td><td><button type="button" className="admin-button is-ghost" onClick={() => toggleNavigation(item)}><AdminStatusBadge status={item.enabled ? 'healthy' : 'unknown'} label={item.enabled ? 'Visível' : 'Oculto'} /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-[var(--admin-line)] md:hidden">{state.navigation.map((item, index) => <article key={item.id} className="space-y-3 py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="font-mono text-xs text-[var(--admin-dim)]">{String(item.order).padStart(2, '0')}</span><span className="grid size-9 shrink-0 place-items-center border border-[var(--admin-line)] text-[var(--accent)]"><NavigationIcon item={item} size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--admin-text)]">{getNavigationDestination(item.id)?.defaultLabel}</p><code className="text-[11px] text-[var(--admin-dim)]">{item.href}</code></div></div><button type="button" className="admin-button is-ghost shrink-0" onClick={() => toggleNavigation(item)}><AdminStatusBadge status={item.enabled ? 'healthy' : 'unknown'} label={item.enabled ? 'Visível' : 'Oculto'} /></button></div><input className="admin-field" value={item.label} onChange={(event) => updateNavigation(item.id, { label: event.target.value })} aria-label={`Rótulo de ${item.label}`} /><div className="flex gap-2"><button type="button" className="admin-button is-ghost flex-1" onClick={() => moveNavigation(index, -1)} disabled={index === 0}><ArrowUp size={14} /> Subir</button><button type="button" className="admin-button is-ghost flex-1" onClick={() => moveNavigation(index, 1)} disabled={index === state.navigation.length - 1}><ArrowDown size={14} /> Descer</button></div></article>)}</div>
      </AdminPanel>}

      {activeTab === 'mobile' && <AdminPanel>
        <div className="admin-panel-header"><div><p className="admin-eyebrow">Barra inferior</p><h2 className="admin-section-title">Atalhos mobile</h2><p className="admin-section-description">A busca permanece fixa no segundo slot. Escolha os outros três destinos entre as páginas habilitadas.</p></div><Smartphone size={20} className="text-[#FF6B00]" aria-hidden="true" /></div>
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">{state.mobileBottomIds.map((id, index) => { const current = state.navigation.find((item) => item.id === id); const options = state.navigation.filter((item) => item.enabled && (item.id === id || (preview.desktop.some((visible) => visible.id === item.id) && !state.mobileBottomIds.includes(item.id)))); return <label key={`mobile-slot-${index}`} className="admin-field-group"><span className="admin-field-label">Slot {index + 1}</span><select className="admin-field" value={id} onChange={(event) => setMobileSlot(index, event.target.value as NavDestinationId)} aria-invalid={hasIssue(issues, 'mobileBottomIds', index)}>{options.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.href}</option>)}</select>{current && <span className="text-[11px] text-[var(--admin-dim)]">Publicado como {current.label}</span>}</label>; })}</div>
        <div className="mx-4 mb-4 mt-5 border-t border-[var(--admin-line)] pt-5 sm:mx-5 sm:mb-5"><p className="admin-eyebrow">Preview</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{preview.mobileBottom.map((item, index) => <PreviewItem key={`${item.id}-${index}`} item={item} />)}</div></div>
      </AdminPanel>}

      {activeTab === 'pages' && <AdminPanel>
        <div className="admin-panel-header"><div><p className="admin-eyebrow">Disponibilidade pública</p><h2 className="admin-section-title">Páginas e redirects</h2><p className="admin-section-description">Ao desativar uma área, o link é ocultado e acessos diretos seguem para o destino escolhido com um aviso breve.</p></div><EyeOff size={20} className="text-[#FF6B00]" aria-hidden="true" /></div>
        <div className="divide-y divide-[var(--admin-line)] p-4 sm:p-5">{state.pages.map((page, index) => { const redirectOptions = [{ value: '/', label: 'Início' }, ...state.navigation.filter((item) => item.enabled && item.id !== page.id && state.pages.find((candidate) => candidate.id === item.id)?.enabled !== false).map((item) => ({ value: item.href, label: item.label }))].filter((option, optionIndex, all) => all.findIndex((candidate) => candidate.value === option.value) === optionIndex); return <article key={page.id} className="space-y-4 py-5 first:pt-0 last:pb-0"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-[var(--admin-text)]">{page.name}</span><AdminStatusBadge status={page.enabled ? 'healthy' : 'unknown'} label={page.enabled ? 'Disponível' : 'Desativada'} /></div><p className="mt-1 font-mono text-[11px] text-[var(--admin-dim)]">{page.href}</p></div><button type="button" className="admin-button is-ghost self-start" onClick={() => togglePage(page)}><span className="inline-flex items-center gap-2">{page.enabled ? <Eye size={14} /> : <EyeOff size={14} />}{page.enabled ? 'Desativar página' : 'Ativar página'}</span></button></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"><label className="admin-field-group"><span className="admin-field-label">Destino após desativação</span><select className="admin-field" value={page.redirectHref} onChange={(event) => updatePage(page.id, { redirectHref: event.target.value })} aria-invalid={hasIssue(issues, 'pages', index, 'redirectHref')}>{redirectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="admin-field-group"><span className="admin-field-label">Aviso breve</span><textarea className="admin-field min-h-20 resize-y" rows={2} value={page.disabledMessage} onChange={(event) => updatePage(page.id, { disabledMessage: event.target.value })} aria-invalid={hasIssue(issues, 'pages', index, 'disabledMessage')} aria-describedby={`navigation-page-help-${page.id}`} /><span id={`navigation-page-help-${page.id}`} className="text-[11px] text-[var(--admin-dim)]">Exibido no destino após o redirect.</span></label></div></article>; })}</div>
      </AdminPanel>}
    </div>

    <NavigationPreviewPanel preview={preview} />
    <div className="flex items-center justify-between gap-3 border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3 text-xs text-[var(--admin-dim)]"><span><Check size={14} className="mr-1 inline text-emerald-400" aria-hidden="true" />Configuração persistida na revisão {state.revision}.</span><span className="font-mono">{state.pages.filter((page) => !page.enabled).length} página(s) desativada(s)</span></div>
    <AdminSaveBar dirty={Boolean(dirty)} saving={saving} onSave={() => void save()} onDiscard={discard} label="Há alterações de navegação não publicadas" />
  </div>;
}
