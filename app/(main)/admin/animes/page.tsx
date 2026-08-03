'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Film,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Tv,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { ImportAnimeModal } from '@/components/admin/ImportAnimeModal';
import { AdminDataTable, AdminEmptyState, AdminFeedback, AdminFilterBar, AdminPageHeader, AdminPanel, type AdminTableColumn } from '@/components/admin/AdminPrimitives';
import { useToast } from '@/context/ToastContext';
import { useConfirmation } from '@/context/ConfirmationContext';

interface AdminAnime {
  id: string;
  title: string;
  originalTitle?: string | null;
  slug: string;
  releaseYear?: number | null;
  status?: string | null;
  posterUrl?: string | null;
  updatedAt?: string;
  _count?: { episodes?: number };
}

export default function AdminAnimesPage() {
  const { showToast } = useToast();
  const { confirm, alert } = useConfirmation();
  const [animes, setAnimes] = useState<AdminAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [episodesFilter, setEpisodesFilter] = useState('all');
  const [sort, setSort] = useState('updatedAt');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyAction, setBusyAction] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [autoIndexerEnabled, setAutoIndexerEnabled] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);

  const fetchAnimes = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', q: search });
      if (statusFilter) params.set('status', statusFilter);
      if (episodesFilter !== 'all') params.set('hasEpisodes', episodesFilter);
      params.set('sort', sort);
      const response = await fetch(`/api/admin/animes?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao carregar o catálogo.');
      setAnimes(payload.animes || []);
      setTotal(payload.pagination?.total || 0);
      setTotalPages(payload.pagination?.totalPages || 1);
      setSelectedIds(new Set());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao carregar o catálogo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutopilotStatus = async () => {
    try {
      const response = await fetch('/api/admin/autopilot', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) setAutoIndexerEnabled(Boolean(payload.autoIndexerEnabled));
    } catch {
      // O estado do autopilot não deve bloquear a operação do catálogo.
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchAnimes(); void fetchAutopilotStatus(); }, 0);
    return () => window.clearTimeout(timer);
    // Filters and pagination are the intentionally stable triggers for the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, episodesFilter, sort]);

  const visibleCount = useMemo(() => animes.length, [animes]);

  const handleToggleAutopilot = async () => {
    setTogglingAuto(true);
    const nextStatus = !autoIndexerEnabled;
    try {
      const response = await fetch('/api/admin/autopilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', enabled: nextStatus }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível alterar o autopilot.');
      setAutoIndexerEnabled(nextStatus);
      showToast({ type: nextStatus ? 'success' : 'info', title: nextStatus ? 'Autopilot ativado' : 'Autopilot desativado', message: payload.message || 'Configuração atualizada.' });
    } catch (reason) {
      showToast({ type: 'error', title: 'Falha no autopilot', message: reason instanceof Error ? reason.message : 'Não foi possível alterar a configuração.' });
    } finally {
      setTogglingAuto(false);
    }
  };

  const handleSync = async (animeId: string, title: string) => {
    setBusyId(animeId);
    try {
      const response = await fetch(`/api/admin/animes/${animeId}/sync`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Não foi possível sincronizar pelo Kenjitsu.');
      showToast({ type: 'success', title: 'Catálogo sincronizado', message: payload.message || `Episódios de “${title}” atualizados.` });
      await fetchAnimes();
    } catch (reason) {
      showToast({ type: 'error', title: 'Falha na sincronização', message: reason instanceof Error ? reason.message : 'Erro de rede durante a sincronização.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const accepted = await confirm({ title: 'Excluir anime e episódios?', description: `“${title}” e todos os episódios associados serão excluídos permanentemente.`, confirmText: 'Excluir anime', cancelText: 'Cancelar', variant: 'danger', animeTitle: title });
    if (!accepted) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/animes/${id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'O servidor recusou a exclusão.');
      setAnimes((current) => current.filter((anime) => anime.id !== id));
      showToast({ type: 'success', title: 'Anime excluído', message: `“${title}” foi removido do catálogo.` });
    } catch (reason) {
      await alert({ title: 'Falha ao excluir o anime', description: reason instanceof Error ? reason.message : 'Atualize a página e tente novamente.', variant: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  const bulkAction = async (action: 'sync' | 'delete') => {
    if (!selectedIds.size) return;
    if (action === 'delete') {
      const accepted = await confirm({ title: `Excluir ${selectedIds.size} animes?`, description: 'Todos os episódios associados aos itens selecionados também serão excluídos. Esta ação não pode ser desfeita.', confirmText: 'Excluir selecionados', cancelText: 'Cancelar', variant: 'danger' });
      if (!accepted) return;
    }
    setBusyAction(true);
    try {
      const response = await fetch('/api/admin/animes/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds], action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha na ação em lote.');
      showToast({ type: payload.summary.failed ? 'error' : 'success', title: action === 'sync' ? 'Sincronização em lote concluída' : 'Exclusão em lote concluída', message: `${payload.summary.succeeded} concluído(s), ${payload.summary.failed} falha(s).` });
      await fetchAnimes();
    } catch (reason) {
      showToast({ type: 'error', title: 'Falha na ação em lote', message: reason instanceof Error ? reason.message : 'Tente novamente.' });
    } finally {
      setBusyAction(false);
    }
  };

  const columns: Array<AdminTableColumn<AdminAnime>> = [
    { key: 'anime', label: 'Anime', render: (anime) => <div className="flex min-w-56 items-center gap-3"><span className="relative grid size-10 shrink-0 overflow-hidden rounded-[7px] bg-[var(--admin-panel-raised)]">{anime.posterUrl && <SafeImage src={anime.posterUrl} alt="" fill className="object-cover" />}</span><span className="min-w-0"><Link href={`/admin/animes/${anime.id}/editar`} className="block truncate text-sm font-bold text-[var(--admin-text)] hover:text-[var(--accent)]">{anime.title}</Link><span className="block truncate text-[.7rem] text-[var(--admin-dim)]">{anime.originalTitle || anime.slug}</span></span></div> },
    { key: 'status', label: 'Status', render: (anime) => <span className="text-xs text-[var(--admin-muted)]">{anime.status || 'Sem status'}</span> },
    { key: 'year', label: 'Ano', render: (anime) => <span className="font-mono-data text-xs text-[var(--admin-muted)]">{anime.releaseYear || '—'}</span> },
    { key: 'episodes', label: 'Episódios', render: (anime) => <span className="inline-flex items-center gap-1.5 font-mono-data text-xs text-[var(--admin-muted)]"><Tv size={14} className="text-[var(--accent)]" />{anime._count?.episodes || 0}</span> },
    { key: 'actions', label: 'Ações', className: 'text-right', render: (anime) => <div className="flex justify-end gap-1.5"><button type="button" className="admin-button is-ghost min-h-10 px-2.5" title="Sincronizar pelo Kenjitsu" onClick={() => void handleSync(anime.id, anime.title)} disabled={busyId === anime.id || busyAction}>{busyId === anime.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}<span className="sr-only">Sincronizar</span></button><Link href={`/admin/animes/${anime.id}/editar`} className="admin-button is-secondary min-h-10 px-2.5" aria-label={`Editar ${anime.title}`}><Edit size={15} /><span className="sr-only">Editar</span></Link><button type="button" className="admin-button is-danger min-h-10 px-2.5" title="Excluir anime" onClick={() => void handleDelete(anime.id, anime.title)} disabled={busyId === anime.id || busyAction}><Trash2 size={15} /><span className="sr-only">Excluir</span></button></div> },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Gerenciar / Catálogo" title="Animes e episódios" description="Mantenha o catálogo local sincronizado e resolva episódios pelo Kenjitsu." breadcrumbs={[{ label: 'Painel', href: '/admin' }, { label: 'Catálogo' }]} actions={<div className="flex flex-wrap gap-2"><button type="button" className={autoIndexerEnabled ? 'admin-button is-secondary' : 'admin-button is-ghost'} onClick={() => void handleToggleAutopilot()} disabled={togglingAuto}>{togglingAuto ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}Autopilot {autoIndexerEnabled ? 'ativo' : 'inativo'}</button><button type="button" className="admin-button is-secondary" onClick={() => setIsImportModalOpen(true)}><Download size={15} />Importar pelo Kenjitsu</button><Link href="/admin/animes/novo" className="admin-button is-primary"><Plus size={16} />Novo anime</Link></div>} />

      {error && <AdminFeedback tone="danger" onDismiss={() => setError('')}>{error}</AdminFeedback>}

      <AdminFilterBar label="Filtrar catálogo">
        <label className="min-w-56 flex-1"><span>Pesquisar</span><span className="relative"><Search size={15} className="absolute left-2.5 top-2.5 text-[var(--admin-dim)]" /><input value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} placeholder="Título, título original ou slug" className="w-full pl-8" /></span></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.currentTarget.value); setPage(1); }}><option value="">Todos</option><option value="Currently Airing">Em lançamento</option><option value="Finished Airing">Concluídos</option><option value="Not yet aired">Anunciados</option></select></label>
        <label><span>Episódios</span><select value={episodesFilter} onChange={(event) => { setEpisodesFilter(event.currentTarget.value); setPage(1); }}><option value="all">Todos</option><option value="yes">Com episódios</option><option value="no">Sem episódios</option></select></label>
        <label><span>Ordenar</span><select value={sort} onChange={(event) => { setSort(event.currentTarget.value); setPage(1); }}><option value="updatedAt">Atualizados recentemente</option><option value="title">Título</option><option value="episodeCount">Episódios</option></select></label>
      </AdminFilterBar>

      <AdminPanel>
        <div className="admin-panel-header flex-wrap items-center"><div><h2 className="text-base font-bold text-[var(--admin-text)]">Catálogo local</h2><p className="mt-1 text-xs text-[var(--admin-muted)]">{total.toLocaleString('pt-BR')} registro(s) · {visibleCount} nesta página</p></div>{selectedIds.size > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[var(--admin-muted)]">{selectedIds.size} selecionado(s)</span><button type="button" className="admin-button is-secondary min-h-10" onClick={() => void bulkAction('sync')} disabled={busyAction}><RefreshCw size={15} />Sincronizar</button><button type="button" className="admin-button is-danger min-h-10" onClick={() => void bulkAction('delete')} disabled={busyAction}><Trash2 size={15} />Excluir</button></div>}</div>
        {loading ? <div className="grid gap-2 p-4" role="status" aria-live="polite">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-[9px] bg-[var(--admin-panel-raised)]" />)}</div> : animes.length ? <><div className="hidden md:block"><AdminDataTable columns={columns} rows={animes} selectedIds={selectedIds} onToggle={(id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onToggleAll={(checked) => setSelectedIds(checked ? new Set(animes.map((anime) => anime.id)) : new Set())} /></div><div className="grid gap-2 p-3 md:hidden">{animes.map((anime) => <article key={anime.id} className="rounded-[10px] border border-[var(--admin-line)] p-3"><div className="flex gap-3"><span className="relative grid size-12 shrink-0 overflow-hidden rounded-[7px] bg-[var(--admin-panel-raised)]">{anime.posterUrl && <SafeImage src={anime.posterUrl} alt="" fill className="object-cover" />}</span><div className="min-w-0 flex-1"><Link href={`/admin/animes/${anime.id}/editar`} className="block truncate text-sm font-bold text-[var(--admin-text)]">{anime.title}</Link><p className="mt-1 truncate text-xs text-[var(--admin-muted)]">{anime.status || 'Sem status'} · {anime._count?.episodes || 0} episódios</p><p className="mt-1 flex items-center gap-1 text-[.68rem] text-[var(--admin-dim)]"><Calendar size={12} />{anime.releaseYear || 'Ano não informado'}</p></div><input type="checkbox" checked={selectedIds.has(anime.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(anime.id)) next.delete(anime.id); else next.add(anime.id); return next; })} aria-label={`Selecionar ${anime.title}`} /></div><div className="mt-3 flex gap-2 border-t border-[var(--admin-line)] pt-3"><button type="button" className="admin-button is-ghost min-h-10 flex-1" onClick={() => void handleSync(anime.id, anime.title)} disabled={busyId === anime.id || busyAction}><RefreshCw size={14} />Sincronizar</button><Link href={`/admin/animes/${anime.id}/editar`} className="admin-button is-secondary min-h-10 flex-1"><Edit size={14} />Editar</Link><button type="button" className="admin-button is-danger min-h-10 px-3" onClick={() => void handleDelete(anime.id, anime.title)} disabled={busyId === anime.id || busyAction}><Trash2 size={14} /></button></div></article>)}</div></> : <AdminEmptyState title="Nenhum anime encontrado" description="Importe um anime pelo Kenjitsu ou ajuste os filtros para encontrar registros no catálogo." action={<Link href="/admin/animes/novo" className="admin-button is-primary"><Plus size={15} />Cadastrar anime</Link>} />}
      </AdminPanel>

      {totalPages > 1 && <nav aria-label="Paginação do catálogo" className="flex items-center justify-center gap-3"><button type="button" className="admin-button is-ghost min-h-10 px-3" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} />Anterior</button><span className="font-mono-data text-xs text-[var(--admin-muted)]">Página {page} de {totalPages}</span><button type="button" className="admin-button is-ghost min-h-10 px-3" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima<ChevronRight size={16} /></button></nav>}

      <ImportAnimeModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={() => void fetchAnimes()} />
    </div>
  );
}
