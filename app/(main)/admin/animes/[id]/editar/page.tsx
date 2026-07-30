'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  Save,
  Plus,
  Tv,
  Film,
  CheckCircle2,
  Edit,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export default function AdminEditAnimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingEp, setAddingEp] = useState(false);

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | ''>('');
  const [status, setStatus] = useState('Em Lançamento');
  const [posterUrl, setPosterUrl] = useState('');
  const [description, setDescription] = useState('');
  const [episodes, setEpisodes] = useState<any[]>([]);

  // Form Novo Episódio
  const [epSeason, setEpSeason] = useState(1);
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar dados do anime
  const loadAnime = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/animes/${id}`);
      const data = await res.json();
      if (res.ok && data.anime) {
        const a = data.anime;
        setTitle(a.title);
        setOriginalTitle(a.originalTitle || '');
        setSlug(a.slug);
        setReleaseYear(a.releaseYear || '');
        setStatus(a.status || 'Em Lançamento');
        setPosterUrl(a.posterUrl || '');
        setDescription(a.description || '');
        setEpisodes(a.episodes || []);
        if (a.episodes?.length > 0) {
          setEpNumber(a.episodes.length + 1);
        }
      } else {
        setError('Anime não encontrado');
      }
    } catch {
      setError('Erro ao carregar dados do anime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnime();
  }, [id]);

  // Atualizar Anime
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/animes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          originalTitle,
          slug,
          releaseYear: typeof releaseYear === 'number' ? releaseYear : undefined,
          status,
          posterUrl,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao atualizar anime');
      }

      setSuccess('Anime atualizado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Adicionar Novo Episódio
  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEp(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/animes/${id}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: epSeason,
          number: epNumber,
          title: epTitle || `Episódio ${epNumber}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao adicionar episódio');
      }

      setEpTitle('');
      setEpNumber(epNumber + 1);
      await loadAnime();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingEp(false);
    }
  };

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/animes/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Episódios e fontes sincronizados com sucesso!');
        await loadAnime();
      } else {
        setError(data.error || 'Falha ao sincronizar episódios');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Carregando dados do anime...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
      {/* Voltar */}
      <Link
        href="/admin/animes"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Voltar ao Catálogo</span>
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div>
          <h1 className="text-2xl font-black text-white">Editar Anime: {title}</h1>
          <p className="text-xs text-gray-400">Altere metadados e gerencie episódios da série</p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-2 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Film size={16} />
          )}
          <span>Sincronizar Episódios e Fontes</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Edição de Anime */}
        <form onSubmit={handleUpdate} className="lg:col-span-2 space-y-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
          <h2 className="text-base font-bold text-white mb-2">Informações do Anime</h2>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Título Original</label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Ano de Lançamento</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              >
                <option value="Em Lançamento">Em Lançamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Anunciado">Anunciado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">URL do Poster</label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Sinopse</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Salvar Alterações</span>
          </button>
        </form>

        {/* Gerenciador de Episódios */}
        <div className="space-y-6">
          {/* Adicionar Episódio */}
          <form onSubmit={handleAddEpisode} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-[#FF6B00]" />
              <span>Novo Episódio</span>
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Temporada</label>
                <input
                  type="number"
                  min={1}
                  value={epSeason}
                  onChange={(e) => setEpSeason(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Número</label>
                <input
                  type="number"
                  min={1}
                  value={epNumber}
                  onChange={(e) => setEpNumber(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">Título do Episódio</label>
              <input
                type="text"
                placeholder={`Episódio ${epNumber}`}
                value={epTitle}
                onChange={(e) => setEpTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={addingEp}
              className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addingEp ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Adicionar Episódio</span>
            </button>
          </form>

          {/* Lista de Episódios */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-white/10 pb-2">
              <span>Episódios Cadastrados</span>
              <span className="text-xs font-mono text-[#FF6B00]">{episodes.length}</span>
            </h2>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {episodes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Nenhum episódio adicionado.</p>
              ) : (
                episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">S{ep.season}E{ep.number}</span>
                      <p className="text-[11px] text-gray-400 line-clamp-1">{ep.title || `Episódio ${ep.number}`}</p>
                    </div>

                    <Link
                      href={`/admin/sources?episodeId=${ep.id}`}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#FF6B00] text-white font-bold text-[10px] transition-all"
                    >
                      Fontes ({ep.sources?.length || 0})
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
