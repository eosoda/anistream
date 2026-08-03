'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Check, FlaskConical, Loader2, Power, Search, ShieldAlert, X } from 'lucide-react';
import {
  AdminDataTable,
  AdminEmptyState,
  AdminFeedback,
  AdminFilterBar,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  type AdminTableColumn,
} from '@/components/admin/AdminPrimitives';
import type { AdminHealthState } from '@/types/admin';

interface ExtensionItem {
  id: string;
  enabled: boolean;
  nsfw: boolean;
  status: AdminHealthState;
  lastTestedAt?: string | null;
  lastTestStatus?: 'healthy' | 'degraded' | 'down' | 'unknown' | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
  manifest?: { name?: string; version?: string; source?: string; capabilities?: string[]; upstream?: { module?: string; repository?: string } } | null;
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Ainda não testada';
}

export default function AdminExtensionsPage() {
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ tone: 'info' | 'success' | 'danger'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [nsfwFilter, setNsfwFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (enabledFilter !== 'all') params.set('enabled', enabledFilter);
      if (nsfwFilter !== 'all') params.set('nsfw', nsfwFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const response = await fetch(`/api/admin/extensions?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao carregar extensões.');
      setExtensions(payload.extensions || []);
      if (payload.kenjitsuError) setMessage({ tone: 'danger', text: `Kenjitsu indisponível: ${payload.kenjitsuError}` });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Falha ao carregar extensões.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // Filters are the intentionally stable trigger for the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledFilter, nsfwFilter, statusFilter]);

  const visibleExtensions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized ? extensions.filter((extension) => `${extension.id} ${extension.manifest?.name || ''}`.toLocaleLowerCase('pt-BR').includes(normalized)) : extensions;
  }, [extensions, query]);

  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? new Set(visibleExtensions.map((extension) => extension.id)) : new Set());

  const patchExtension = async (id: string, change: { enabled?: boolean; nsfw?: boolean }) => {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/extensions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...change }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar extensão.');
      setMessage({ tone: 'success', text: 'Configuração aplicada às próximas consultas.' });
      await load();
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Falha ao salvar extensão.' });
    } finally {
      setBusyId(null);
    }
  };

  const testExtension = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/extensions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const payload = await response.json();
      if (!response.ok && !payload.status) throw new Error(payload.error || 'Falha no teste da extensão.');
      const chain = [
        payload.searchResultCount != null ? `${payload.searchResultCount} resultados` : null,
        payload.episodeCount != null ? `${payload.episodeCount} episódios` : null,
        payload.sourceCount != null ? `${payload.sourceCount} sources` : null,
      ].filter(Boolean).join(' · ');
      setMessage({
        tone: payload.status === 'healthy' ? 'success' : payload.status === 'degraded' ? 'info' : 'danger',
        text: `${id}: ${payload.status || 'down'}${payload.latencyMs ? ` · ${payload.latencyMs}ms` : ''}${chain ? ` · ${chain}` : ''}${payload.error ? ` · ${payload.error}` : ''}`,
      });
      await load();
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Falha no teste da extensão.' });
    } finally {
      setBusyId(null);
    }
  };

  const bulkAction = async (action: 'enable' | 'disable') => {
    if (!selectedIds.size) return;
    setBulkBusy(true);
    try {
      const response = await fetch('/api/admin/extensions/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds], action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha na ação em lote.');
      setSelectedIds(new Set());
      setMessage({ tone: payload.summary.failed ? 'danger' : 'success', text: `${payload.summary.succeeded} extensão(ões) atualizada(s).` });
      await load();
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : 'Falha na ação em lote.' });
    } finally {
      setBulkBusy(false);
    }
  };

  const columns: Array<AdminTableColumn<ExtensionItem>> = [
    { key: 'extension', label: 'Extensão', render: (extension) => <div className="min-w-48"><strong className="block text-sm text-[var(--admin-text)]">{extension.manifest?.name || extension.id}</strong><span className="font-mono-data text-[.7rem] text-[var(--admin-dim)]">{extension.id} · v{extension.manifest?.version || '—'}</span></div> },
    { key: 'state', label: 'Estado', render: (extension) => <AdminStatusBadge status={extension.status} /> },
    { key: 'policy', label: 'Política', render: (extension) => <div className="flex flex-wrap gap-1.5 text-[.7rem]"><span className={extension.enabled ? 'text-[var(--success)]' : 'text-[var(--admin-dim)]'}>{extension.enabled ? 'Ativa' : 'Desativada'}</span><span className="text-[var(--admin-dim)]">·</span><span className={extension.nsfw ? 'text-[var(--warning)]' : 'text-[var(--admin-muted)]'}>{extension.nsfw ? 'NSFW bloqueado' : 'NSFW permitido'}</span></div> },
    { key: 'capabilities', label: 'Capacidades', render: (extension) => <span className="text-xs text-[var(--admin-muted)]">{extension.manifest?.capabilities?.slice(0, 3).join(' · ') || 'Catálogo · mídia'}</span> },
    { key: 'lastTest', label: 'Último teste', render: (extension) => <div><span className="block text-xs text-[var(--admin-muted)]">{formatDate(extension.lastTestedAt)}</span>{extension.lastLatencyMs != null && <span className="font-mono-data text-[.7rem] text-[var(--admin-dim)]">{extension.lastLatencyMs}ms</span>}{extension.lastError && <span className="mt-1 block max-w-44 truncate text-[.68rem] text-[var(--danger)]" title={extension.lastError}>{extension.lastError}</span>}</div> },
    { key: 'actions', label: 'Ações', className: 'text-right', render: (extension) => { const busy = busyId === extension.id; return <div className="flex min-w-52 justify-end gap-1.5"><button type="button" className="admin-button is-ghost min-h-10 px-2.5" aria-pressed={extension.enabled} onClick={() => void patchExtension(extension.id, { enabled: !extension.enabled })} disabled={busy || bulkBusy} title={extension.enabled ? 'Desativar extensão' : 'Ativar extensão'}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}<span className="sr-only">{extension.enabled ? 'Desativar' : 'Ativar'}</span></button><button type="button" className="admin-button is-ghost min-h-10 px-2.5" onClick={() => void patchExtension(extension.id, { nsfw: !extension.nsfw })} disabled={busy || bulkBusy} title={extension.nsfw ? 'Permitir extensão NSFW' : 'Bloquear extensão NSFW'}>{extension.nsfw ? <ShieldAlert size={15} /> : <Check size={15} />}<span className="sr-only">{extension.nsfw ? 'Permitir NSFW' : 'Bloquear NSFW'}</span></button><button type="button" className="admin-button is-secondary min-h-10 px-2.5" onClick={() => void testExtension(extension.id)} disabled={busy || bulkBusy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}Testar</button></div>; } },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Monitorar / Kenjitsu" title="Extensões" description="Controle as fontes que participam da resolução de metadados, episódios e mídia." breadcrumbs={[{ label: 'Painel', href: '/admin' }, { label: 'Extensões Kenjitsu' }]} actions={<div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]"><Activity size={15} className="text-[var(--accent)]" />{extensions.length} cadastradas</div>} />

      {message && <AdminFeedback tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</AdminFeedback>}

      <AdminFilterBar label="Filtrar extensões">
        <label className="min-w-56 flex-1"><span>Pesquisar</span><span className="relative"><Search size={15} className="absolute left-2.5 top-2.5 text-[var(--admin-dim)]" /><input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nome ou identificador" className="w-full pl-8" /></span></label>
        <label><span>Ativação</span><select value={enabledFilter} onChange={(event) => setEnabledFilter(event.currentTarget.value)}><option value="all">Todas</option><option value="yes">Ativas</option><option value="no">Desativadas</option></select></label>
        <label><span>NSFW</span><select value={nsfwFilter} onChange={(event) => setNsfwFilter(event.currentTarget.value)}><option value="all">Todas</option><option value="yes">Bloqueadas</option><option value="no">Permitidas</option></select></label>
        <label><span>Saúde</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value)}><option value="all">Todos</option><option value="healthy">Operacionais</option><option value="degraded">Degradadas</option><option value="down">Indisponíveis</option><option value="unknown">Sem teste</option></select></label>
      </AdminFilterBar>

      <AdminPanel>
        <div className="admin-panel-header flex-wrap items-center"><div><h2 className="text-base font-bold text-[var(--admin-text)]">Inventário de extensões</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">Selecione linhas para aplicar uma política de ativação em lote. Testes continuam individuais para proteger o Kenjitsu.</p></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[var(--admin-muted)]">{selectedIds.size} selecionada(s)</span><button type="button" className="admin-button is-secondary min-h-10" onClick={() => void bulkAction('enable')} disabled={!selectedIds.size || bulkBusy}>{bulkBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Ativar</button><button type="button" className="admin-button is-ghost min-h-10" onClick={() => void bulkAction('disable')} disabled={!selectedIds.size || bulkBusy}><X size={15} />Desativar</button></div></div>
        {loading ? <div className="grid gap-2 p-4" role="status" aria-live="polite">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-[9px] bg-[var(--admin-panel-raised)]" />)}</div> : visibleExtensions.length ? <AdminDataTable columns={columns} rows={visibleExtensions} selectedIds={selectedIds} onToggle={toggleSelected} onToggleAll={toggleAll} /> : <AdminEmptyState title="Nenhuma extensão encontrada" description="Ajuste os filtros ou atualize o inventário do Kenjitsu." />}
      </AdminPanel>
    </div>
  );
}
