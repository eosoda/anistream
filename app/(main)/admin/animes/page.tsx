'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tv,
  Download,
  RefreshCw,
  Power,
  Sparkles,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { ImportAnimeModal } from '@/components/admin/ImportAnimeModal';
import { useToast } from '@/context/ToastContext';
import { useConfirmation } from '@/context/ConfirmationContext';

export default function AdminAnimesPage() {
  const { showToast } = useToast();
  const { confirm, alert } = useConfirmation();
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modal de importação & Autopilot status
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [autoIndexerEnabled, setAutoIndexerEnabled] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);

  const fetchAnimes = async (query = '', pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/animes?q=${encodeURIComponent(query)}&page=${pageNum}`);
      const data = await res.json();
      if (res.ok) {
        setAnimes(data.animes || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutopilotStatus = async () => {
    try {
      const res = await fetch('/api/admin/autopilot');
      const data = await res.json();
      if (res.ok) {
        setAutoIndexerEnabled(data.autoIndexerEnabled);
      }
    } catch (err) {
      // Ignorar falha silenciada
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAnimes(search, page);
      void fetchAutopilotStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page, search]);

  const handleToggleAutopilot = async () => {
    setTogglingAuto(true);
    const newStatus = !autoIndexerEnabled;
    try {
      const res = await fetch('/api/admin/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', enabled: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setAutoIndexerEnabled(newStatus);
        showToast({
          type: newStatus ? 'success' : 'info',
          title: newStatus ? 'Autopilot Ativado' : 'Autopilot Desativado',
          message: data.message || `Indexação automática ${newStatus ? 'ativada' : 'desativada'}.`,
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro ao alterar Autopilot',
        message: 'Não foi possível alterar a configuração de indexação automática.',
      });
    } finally {
      setTogglingAuto(false);
    }
  };

  const handleSyncAnime = async (animeId: string, title: string) => {
    setSyncingId(animeId);
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast({
          type: 'success',
          title: 'Sincronização Concluída! 🔄',
          message: data.message || `Episódios e fontes de "${title}" sincronizados com sucesso.`,
        });
        fetchAnimes(search, page);
      } else {
        showToast({
          type: 'error',
          title: 'Falha na Sincronização',
          message: data.error || 'Erro ao sincronizar episódios e fontes.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: err.message || 'Erro de rede durante sincronização.',
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAnimes(search, 1);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Excluir anime e episódios?',
      description: `“${title}” e todos os episódios e fontes associados serão excluídos permanentemente.`,
      confirmText: 'Excluir anime',
      cancelText: 'Cancelar',
      variant: 'danger',
      animeTitle: title,
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/animes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnimes(animes.filter((a) => a.id !== id));
      } else {
        await alert({
          title: 'Falha ao excluir o anime',
          description: 'O servidor recusou a exclusão. Atualize a página e tente novamente.',
          variant: 'danger',
        });
      }
    } catch {
      await alert({
        title: 'Erro de conexão',
        description: 'Não foi possível alcançar o servidor. Verifique a conexão e tente novamente.',
        variant: 'danger',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header com Ações Globais */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Film size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Gerenciamento de Catálogo</h1>
            <p className="text-xs text-gray-400">
              Cadastre, edite, importe via MAL e gerencie o catálogo de animes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão de Alternar Autopilot / Adição Automática */}
          <button
            onClick={handleToggleAutopilot}
            disabled={togglingAuto}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border ${
              autoIndexerEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Alternar Adição Automática de Animes"
          >
            {togglingAuto ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Power size={15} />
            )}
            <span>Auto-Animes: {autoIndexerEnabled ? 'ATIVADO' : 'DESATIVADO'}</span>
          </button>

          {/* Botão Importar Anime */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10"
          >
            <Download size={15} className="text-[#FF6B00]" />
            <span>Importar Anime (MAL/Jikan)</span>
          </button>

          {/* Cadastrar Manual */}
          <Link
            href="/admin/animes/novo"
            className="px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20"
          >
            <Plus size={18} />
            <span>Novo Anime</span>
          </Link>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar anime por título ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10"
        >
          Buscar
        </button>
      </form>

      {/* Grid de Animes */}
      {loading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
          <p className="text-xs font-bold text-gray-400">Carregando catálogo...</p>
        </div>
      ) : animes.length === 0 ? (
        <div className="w-full py-16 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center p-6 space-y-3">
          <Film size={40} className="text-gray-500 mb-1" />
          <h3 className="text-base font-bold text-white">Nenhum anime cadastrado</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Clique no botão acima para importar um anime do MAL/Jikan ou cadastrar um novo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {animes.map((anime) => (
            <div
              key={anime.id}
              className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="w-full aspect-[2/3] relative rounded-2xl overflow-hidden bg-black/50 border border-white/10">
                  <SafeImage
                    src={anime.posterUrl || ''}
                    alt={anime.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {anime.status && (
                    <span className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#FF6B00]">
                      {anime.status}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#FF6B00] transition-colors">
                    {anime.title}
                  </h3>
                  {anime.originalTitle && (
                    <p className="text-[11px] text-gray-400 line-clamp-1">
                      {anime.originalTitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 font-mono border-t border-white/10 pt-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-[#FF6B00]" />
                    {anime.releaseYear || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-white">
                    <Tv size={13} className="text-[#FF6B00]" />
                    {anime._count?.episodes || 0} eps
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleSyncAnime(anime.id, anime.title)}
                  disabled={syncingId === anime.id}
                  className="py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-all border border-emerald-500/20"
                  title="Sincronizar Episódios e Fontes"
                >
                  {syncingId === anime.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  <span>Sync</span>
                </button>

                <Link
                  href={`/admin/animes/${anime.id}/editar`}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-[#FF6B00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit size={14} />
                  <span>Editar</span>
                </Link>

                <button
                  onClick={() => handleDelete(anime.id, anime.title)}
                  disabled={deletingId === anime.id}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20"
                  title="Excluir Anime"
                >
                  {deletingId === anime.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold text-gray-400">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal de Importação Manual */}
      <ImportAnimeModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchAnimes(search, page)}
      />
    </div>
  );
}
