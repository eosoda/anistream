'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Compass, Eye, EyeOff, FileText, Home, Layout, Loader2, Save } from 'lucide-react';
import type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar, AdminStatusBadge } from '@/components/admin';

type NavigationState = { navigation: NavItemConfig[]; pages: PageFeatureConfig[]; homeSections: HomeSectionConfig[] };
const emptyState: NavigationState = { navigation: [], pages: [], homeSections: [] };

export default function AdminNavigationPage() {
  const [activeTab, setActiveTab] = useState<'navbar' | 'pages' | 'home'>('navbar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [state, setState] = useState<NavigationState>(emptyState);
  const [savedState, setSavedState] = useState<NavigationState>(emptyState);
  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(savedState), [savedState, state]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/navigation', { signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar a navegação.');
      const nextState: NavigationState = { navigation: payload.data?.navigation || [], pages: payload.data?.pages || [], homeSections: payload.data?.homeSections || [] };
      setState(nextState);
      setSavedState(nextState);
    }).catch((loadError) => { if (loadError.name !== 'AbortError') setFeedback({ tone: 'danger', message: loadError instanceof Error ? loadError.message : 'Falha ao carregar a navegação.' }); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/navigation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'Falha ao salvar a navegação.');
      setSavedState(state);
      setFeedback({ tone: 'success', message: 'Navegação publicada e registrada na auditoria.' });
    } catch (saveError) {
      setFeedback({ tone: 'danger', message: saveError instanceof Error ? saveError.message : 'Falha ao salvar a navegação.' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setState(savedState);
    setFeedback({ tone: 'success', message: 'Alterações locais descartadas.' });
  };

  const toggleNav = (id: string) => setState((current) => ({ ...current, navigation: current.navigation.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item) }));
  const moveNav = (index: number, direction: 'up' | 'down') => setState((current) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= current.navigation.length) return current;
    const next = [...current.navigation];
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, navigation: next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) };
  });
  const togglePage = (id: string) => setState((current) => ({ ...current, pages: current.pages.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item) }));
  const updatePageMessage = (id: string, message: string) => setState((current) => ({ ...current, pages: current.pages.map((item) => item.id === id ? { ...item, disabledMessage: message } : item) }));
  const toggleHomeSection = (id: string) => setState((current) => ({ ...current, homeSections: current.homeSections.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item) }));
  const moveHomeSection = (index: number, direction: 'up' | 'down') => setState((current) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= current.homeSections.length) return current;
    const next = [...current.homeSections];
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, homeSections: next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) };
  });

  if (loading) {
    return <div className="admin-empty-state min-h-[420px]" aria-live="polite"><Loader2 size={24} className="animate-spin text-[#FF6B00]" aria-hidden="true" /><h2>Carregando navegação</h2><p>Consultando configurações publicadas.</p></div>;
  }

  const tabs = [
    { id: 'navbar' as const, label: `Menu (${state.navigation.length})`, icon: Layout },
    { id: 'pages' as const, label: `Páginas (${state.pages.length})`, icon: FileText },
    { id: 'home' as const, label: `Home (${state.homeSections.length})`, icon: Home },
  ];

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader eyebrow="Gerenciar / Experiência" title="Navegação" description="Publique a ordem do menu, a disponibilidade de páginas e as seções da Home." breadcrumbs={[{ label: 'Navegação' }]} actions={<div className="flex flex-wrap gap-2"><Link href="/admin" className="admin-button is-ghost">Voltar à visão geral</Link><button type="button" className="admin-button is-primary" onClick={() => void save()} disabled={saving || !dirty}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Publicar alterações</button></div>} />
      {feedback && <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</AdminFeedback>}

      <div className="flex flex-wrap gap-2 border-b border-[var(--admin-line)] pb-3" role="tablist" aria-label="Configurações de navegação">
        {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} id={`navigation-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`navigation-panel-${tab.id}`} className={`admin-button ${activeTab === tab.id ? 'is-primary' : 'is-ghost'}`} onClick={() => setActiveTab(tab.id)}><Icon size={15} aria-hidden="true" />{tab.label}</button>; })}
      </div>

      <div id={`navigation-panel-${activeTab}`} role="tabpanel" aria-labelledby={`navigation-tab-${activeTab}`}>
        {activeTab === 'navbar' && <AdminPanel>
          <div className="admin-panel-header"><div><p className="admin-eyebrow">Menu principal</p><h2 className="admin-section-title">Ordem da navbar</h2><p className="admin-section-description">Use os controles de subir e descer; a ordem publicada é preservada em teclado.</p></div><span className="font-mono text-[11px] text-[var(--admin-dim)]">{state.navigation.filter((item) => item.enabled).length} visíveis</span></div>
          {state.navigation.length === 0 ? <AdminEmptyState title="Nenhum item de menu" description="A configuração retornada não contém itens editáveis." /> : <div className="divide-y divide-[var(--admin-line)]">{state.navigation.map((item, index) => <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center border border-[var(--admin-line)] font-mono text-xs text-[var(--admin-dim)]">{item.order}</span><div className="min-w-0"><label className="admin-field-group"><span className="sr-only">Rótulo de {item.href}</span><input className="admin-field" value={item.label} onChange={(event) => setState((current) => ({ ...current, navigation: current.navigation.map((nav) => nav.id === item.id ? { ...nav, label: event.target.value } : nav) }))} /></label><p className="mt-1 truncate font-mono text-[11px] text-[var(--admin-dim)]">{item.href}</p></div></div><div className="flex flex-wrap items-center gap-2"><button type="button" className="admin-icon-button" onClick={() => moveNav(index, 'up')} disabled={index === 0} aria-label={`Mover ${item.label} para cima`}><ArrowUp size={16} /></button><button type="button" className="admin-icon-button" onClick={() => moveNav(index, 'down')} disabled={index === state.navigation.length - 1} aria-label={`Mover ${item.label} para baixo`}><ArrowDown size={16} /></button><button type="button" className="admin-button is-ghost" onClick={() => toggleNav(item.id)}><span className={`admin-status-badge ${item.enabled ? 'is-healthy' : 'is-unknown'}`}><span className="admin-status-dot" aria-hidden="true" />{item.enabled ? <><Eye size={13} aria-hidden="true" /> Visível</> : <><EyeOff size={13} aria-hidden="true" /> Oculto</>}</span></button></div></div>)}</div>}
        </AdminPanel>}

        {activeTab === 'pages' && <AdminPanel>
          <div className="admin-panel-header"><div><p className="admin-eyebrow">Disponibilidade pública</p><h2 className="admin-section-title">Páginas e mensagens</h2><p className="admin-section-description">Uma página desativada continua informando o motivo ao usuário.</p></div></div>
          {state.pages.length === 0 ? <AdminEmptyState title="Nenhuma página configurável" description="A configuração retornada não contém páginas editáveis." /> : <div className="divide-y divide-[var(--admin-line)]">{state.pages.map((page) => <div key={page.id} className="space-y-3 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[var(--admin-text)]">{page.name}</p><p className="mt-1 font-mono text-[11px] text-[var(--admin-dim)]">{page.href}</p></div><button type="button" className="admin-button is-ghost self-start sm:self-auto" onClick={() => togglePage(page.id)}><AdminStatusBadge status={page.enabled ? 'healthy' : 'unknown'} label={page.enabled ? 'Página no ar' : 'Página desativada'} /></button></div>{!page.enabled && <label className="admin-field-group border-t border-[var(--admin-line)] pt-3"><span className="admin-field-label">Mensagem exibida ao usuário</span><textarea className="admin-field min-h-20 resize-y" rows={2} value={page.disabledMessage} onChange={(event) => updatePageMessage(page.id, event.target.value)} placeholder="Explique a indisponibilidade temporária." /></label>}</div>)}</div>}
        </AdminPanel>}

        {activeTab === 'home' && <AdminPanel>
          <div className="admin-panel-header"><div><p className="admin-eyebrow">Página inicial</p><h2 className="admin-section-title">Seções da Home</h2><p className="admin-section-description">Controle visibilidade e ordem dos blocos sem arrastar elementos.</p></div></div>
          {state.homeSections.length === 0 ? <AdminEmptyState title="Nenhuma seção configurável" description="A configuração retornada não contém seções editáveis." /> : <div className="divide-y divide-[var(--admin-line)]">{state.homeSections.map((section, index) => <div key={section.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center border border-[var(--admin-line)] font-mono text-xs text-[var(--admin-dim)]">{section.order}</span><span className="text-sm font-semibold text-[var(--admin-text)]">{section.name}</span></div><div className="flex flex-wrap items-center gap-2"><button type="button" className="admin-icon-button" onClick={() => moveHomeSection(index, 'up')} disabled={index === 0} aria-label={`Mover ${section.name} para cima`}><ArrowUp size={16} /></button><button type="button" className="admin-icon-button" onClick={() => moveHomeSection(index, 'down')} disabled={index === state.homeSections.length - 1} aria-label={`Mover ${section.name} para baixo`}><ArrowDown size={16} /></button><button type="button" className="admin-button is-ghost" onClick={() => toggleHomeSection(section.id)}><AdminStatusBadge status={section.enabled ? 'healthy' : 'unknown'} label={section.enabled ? 'Exibida na Home' : 'Oculta da Home'} /></button></div></div>)}</div>}
        </AdminPanel>}
      </div>

      <AdminSaveBar dirty={dirty} saving={saving} onSave={() => void save()} onDiscard={discard} label="Há alterações de navegação não publicadas" />
    </div>
  );
}
