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
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export default function AdminAnimesPage() {
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAnimes(search, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAnimes(search, 1);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir o anime "${title}" e todos os seus episódios?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/animes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAnimes(animes.filter((a) => a.id !== id));
      } else {
        alert('Falha ao excluir o anime.');
      }
    } catch {
      alert('Erro de conexão ao excluir o anime.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Film size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Gerenciamento de Catálogo</h1>
            <p className="text-xs text-gray-400">
              Cadastre, edite e gerencie animes, temporadas e episódios
            </p>
          </div>
        </div>

        <Link
          href="/admin/animes/novo"
          className="px-5 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20"
        >
          <Plus size={18} />
          <span>Cadastrar Novo Anime</span>
        </Link>
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
            Clique no botão acima para adicionar um novo anime ou pesquise outro termo.
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
    </div>
  );
}
