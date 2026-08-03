'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Database,
  Film,
  History,
  Puzzle,
  RefreshCw,
  Server,
  Settings,
  Tv,
} from 'lucide-react';
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import type { AdminOverview } from '@/types/admin';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

const quickLinks = [
  { label: 'Catálogo', description: 'Animes e episódios', href: '/admin/animes', icon: Film },
  { label: 'Extensões', description: 'Saúde e ativação Kenjitsu', href: '/admin/extensions', icon: Puzzle },
  { label: 'Sistema', description: 'Manutenção e disponibilidade', href: '/admin/system', icon: Settings },
  { label: 'Backups', description: 'Exportar ou restaurar dados', href: '/admin/backups', icon: Database },
  { label: 'Calendário', description: 'Release Schedule semanal', href: '/admin/calendar', icon: CalendarDays },
];

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao carregar a visão geral.');
      setOverview(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar a visão geral.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [load]);

  if (loading && !overview) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="admin-page-header"><div className="space-y-3"><div className="h-3 w-28 animate-pulse rounded bg-[var(--admin-panel-raised)]" /><div className="h-9 w-64 animate-pulse rounded bg-[var(--admin-panel-raised)]" /><div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--admin-panel-raised)]" /></div><div className="h-11 w-28 animate-pulse rounded-[var(--admin-radius)] bg-[var(--admin-panel-raised)]" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="admin-panel h-28 animate-pulse" />)}</div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="admin-panel h-80 animate-pulse" /><div className="admin-panel h-80 animate-pulse" /></div>
      </div>
    );
  }

  const kpis = overview?.kpis;
  const extensions = [...(overview?.extensions || [])].sort((a, b) => Number(a.status === 'healthy') - Number(b.status === 'healthy')).slice(0, 8);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operação"
        title="Visão geral"
        description="Estado do catálogo, das extensões Kenjitsu e das tarefas que precisam de atenção."
        breadcrumbs={[{ label: 'Painel' }]}
        actions={<button type="button" className="admin-button is-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />Atualizar</button>}
      />

      {error && <AdminFeedback tone="danger">{error}</AdminFeedback>}

      {overview && (
        <>
          <section className="admin-overview-strip" aria-label="Saúde dos serviços">
            <div className="flex min-w-0 items-center gap-3"><Activity size={18} className="text-[var(--accent)]" /><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--admin-dim)]">Estado agora</p><p className="mt-1 text-sm font-semibold text-[var(--admin-text)]">Atualizado em {formatDate(overview.generatedAt)}</p></div></div>
            <div className="flex flex-wrap items-center gap-2">{overview.services.map((service) => <span key={service.id} className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]"><span className="text-[var(--admin-dim)]">{service.label}</span><AdminStatusBadge status={service.status} label={service.status === 'healthy' ? 'OK' : undefined} /></span>)}<span className="font-mono-data text-xs text-[var(--admin-muted)]">Saúde {overview.kpis.overallHealthScore}%</span></div>
          </section>

          <section aria-label="Indicadores principais" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Animes no catálogo', value: kpis?.animeCount || 0, icon: Film },
              { label: 'Episódios', value: kpis?.episodeCount || 0, icon: Tv },
              { label: 'Extensões ativas', value: kpis?.enabledExtensionsCount || 0, icon: Puzzle },
              { label: 'Alertas pendentes', value: kpis?.pendingAlertsCount || 0, icon: AlertTriangle },
            ].map((item) => { const Icon = item.icon; return <AdminPanel key={item.label} className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-semibold text-[var(--admin-muted)]">{item.label}</p><p className="mt-2 font-mono-data text-2xl font-bold text-[var(--admin-text)]">{item.value.toLocaleString('pt-BR')}</p></div><span className="grid size-10 place-items-center rounded-[10px] bg-[var(--admin-panel-raised)] text-[var(--accent)]"><Icon size={18} /></span></AdminPanel>; })}
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <AdminPanel>
              <div className="admin-panel-header"><div><h2 className="text-base font-bold text-[var(--admin-text)]">Fila de atenção</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">Relatos que ainda exigem uma decisão.</p></div><Link href="/admin/animes" className="admin-button is-ghost">Ver catálogo <ArrowUpRight size={15} /></Link></div>
              {overview.alerts.length ? <div className="divide-y divide-[var(--admin-line)]">{overview.alerts.map((alert) => <div key={alert.id} className="flex items-start gap-3 px-4 py-3.5"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[9px] bg-[rgba(245,170,50,.12)] text-[var(--warning)]"><AlertTriangle size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--admin-text)]">{alert.animeTitle} <span className="font-normal text-[var(--admin-muted)]">· episódio {alert.episodeNumber ?? '—'}</span></p><p className="mt-1 truncate text-xs text-[var(--admin-muted)]">{alert.description || alert.type}</p></div><span className="shrink-0 text-[.68rem] text-[var(--admin-dim)]">{formatDate(alert.createdAt)}</span></div>)}</div> : <AdminEmptyState title="Nenhum alerta pendente" description="A fila está limpa. Novos relatos aparecerão aqui quando chegarem." />}
            </AdminPanel>

            <AdminPanel>
              <div className="admin-panel-header"><div><h2 className="text-base font-bold text-[var(--admin-text)]">Extensões Kenjitsu</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">As fontes ativas no caminho de resolução.</p></div><Link href="/admin/extensions" className="admin-button is-ghost">Gerenciar <ArrowUpRight size={15} /></Link></div>
              {extensions.length ? <div className="divide-y divide-[var(--admin-line)]">{extensions.map((extension) => <div key={extension.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[var(--admin-panel-raised)] text-[var(--accent)]"><Puzzle size={15} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[var(--admin-text)]">{extension.name}</strong><small className="block truncate text-xs text-[var(--admin-muted)]">{extension.enabled ? 'Ativa' : 'Desativada'}{extension.latencyMs != null ? ` · ${extension.latencyMs}ms` : ''}</small></span><AdminStatusBadge status={extension.status} /></div>)}</div> : <AdminEmptyState title="Sem extensões carregadas" description="O Kenjitsu ainda não retornou o inventário de extensões." />}
            </AdminPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <AdminPanel>
              <div className="admin-panel-header"><div><h2 className="flex items-center gap-2 text-base font-bold text-[var(--admin-text)]"><History size={17} className="text-[var(--accent)]" />Atividade recente</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">Alterações administrativas registradas.</p></div><Link href="/admin/system" className="admin-button is-ghost">Histórico <ArrowUpRight size={15} /></Link></div>
              {overview.activity.length ? <div className="divide-y divide-[var(--admin-line)]">{overview.activity.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--admin-text)]">{entry.summary}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{entry.actorName || 'Sistema'} · {entry.action}</p></div><time className="shrink-0 text-[.68rem] text-[var(--admin-dim)]">{formatDate(entry.createdAt)}</time></div>)}</div> : <AdminEmptyState title="Nenhuma atividade registrada" description="As próximas alterações feitas no painel aparecerão neste histórico." />}
            </AdminPanel>
            <AdminPanel>
              <div className="admin-panel-header"><div><h2 className="flex items-center gap-2 text-base font-bold text-[var(--admin-text)]"><Server size={17} className="text-[var(--accent)]" />Atalhos de operação</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">Ações frequentes sem perder o contexto.</p></div></div>
              <nav className="grid gap-1.5 p-2" aria-label="Atalhos administrativos">{quickLinks.map((link) => { const Icon = link.icon; return <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-[9px] p-3 hover:bg-white/[.045]"><span className="grid size-8 place-items-center rounded-[8px] bg-[var(--admin-panel-raised)] text-[var(--accent)]"><Icon size={15} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[var(--admin-text)]">{link.label}</strong><small className="block text-xs text-[var(--admin-muted)]">{link.description}</small></span><ArrowUpRight size={15} className="text-[var(--admin-dim)]" /></Link>; })}</nav>
            </AdminPanel>
          </div>
        </>
      )}
    </div>
  );
}
