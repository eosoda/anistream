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
  Trash2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { EpisodeSourcesModal } from '@/components/admin/EpisodeSourcesModal';

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

  // Modal de fontes do episódio selecionado
  const [selectedEpForSources, setSelectedEpForSources] = useState<{
    episodeId: string;
    episodeNumber: number;
    seasonNumber: number;
    episodeTitle?: string;
  } | null>(null);

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
        throw new Error(data.error || 'Falha ao salvar anime');
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

  // Excluir Episódio
  const handleDeleteEpisode = async (epId: string, epNum: number) => {
    if (!confirm(`Deseja excluir o episódio ${epNum}?`)) return;
    try {
      const res = await fetch(`/api/admin/animes/${id}/episodes/${epId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadAnime();
      }
    } catch {
      setError('Erro ao excluir episódio.');
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
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F]">
        <Loader2 className="animate-spin text-[#FF6B00]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] p-4 sm:p-8 space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/animes"
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Editar Anime</h1>
            <p className="text-xs text-gray-400">ID: {id}</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>Sincronizar Episódios/Fontes</span>
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
          {success}
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Dados do Anime */}
        <form
          onSubmit={handleUpdate}
          className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Título Principal</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Título Original / Japonês</label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Slug URL</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Ano de Lançamento</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value ? parseInt(e.target.value, 10) : '')}
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              >
                <option value="Em Lançamento">Em Lançamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Pausado">Pausado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">URL do Poster / Capa</label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
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
            <span>Salvar Alterações do Anime</span>
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

          {/* Lista de Episódios com Gerenciamento de Fontes */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-white/10 pb-2">
              <span>Episódios Cadastrados</span>
              <span className="text-xs font-mono text-[#FF6B00]">{episodes.length}</span>
            </h2>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {episodes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Nenhum episódio adicionado.</p>
              ) : (
                episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white">S{ep.season}E{ep.number}</span>
                      <p className="text-[11px] text-gray-400 truncate">{ep.title || `Episódio ${ep.number}`}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botão para Abrir Modal de Gerenciamento de Fontes */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedEpForSources({
                            episodeId: ep.id,
                            episodeNumber: ep.number,
                            seasonNumber: ep.season,
                            episodeTitle: ep.title,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-[#FF6B00]/20 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white font-bold text-[10px] transition-all flex items-center gap-1 border border-[#FF6B00]/30"
                      >
                        <Tv size={12} />
                        <span>Fontes ({ep.sources?.length || 0})</span>
                      </button>

                      {/* Botão de Excluir Episódio */}
                      <button
                        type="button"
                        onClick={() => handleDeleteEpisode(ep.id, ep.number)}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20"
                        title="Excluir Episódio"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Gerenciamento de Fontes do Episódio Selecionado */}
      {selectedEpForSources && (
        <EpisodeSourcesModal
          isOpen={Boolean(selectedEpForSources)}
          animeId={id}
          episodeId={selectedEpForSources.episodeId}
          episodeNumber={selectedEpForSources.episodeNumber}
          seasonNumber={selectedEpForSources.seasonNumber}
          episodeTitle={selectedEpForSources.episodeTitle}
          onClose={() => setSelectedEpForSources(null)}
          onSuccess={loadAnime}
        />
      )}
    </div>
  );
}
