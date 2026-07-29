'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Calendar,
  Tag,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export default function AdminNewAnimePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | ''>(new Date().getFullYear());
  const [status, setStatus] = useState('Em Lançamento');
  const [posterUrl, setPosterUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-preenchimento via API Jikan / MAL
  const handleAutofill = async () => {
    if (!title.trim()) {
      setError('Digite o título do anime antes de buscar os dados automáticos.');
      return;
    }

    setAutofilling(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/animes/autofill?title=${encodeURIComponent(title.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar dados no MyAnimeList');
      }

      const match = data.results[0];
      if (match) {
        setTitle(match.title);
        setOriginalTitle(match.originalTitle || '');
        setSlug(match.slug);
        setReleaseYear(match.releaseYear || new Date().getFullYear());
        setStatus(match.status || 'Em Lançamento');
        setPosterUrl(match.posterUrl || '');
        setBannerUrl(match.bannerUrl || match.posterUrl || '');
        setDescription(match.description || '');
        setSuccess('Metadados importados com sucesso da API Jikan!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAutofilling(false);
    }
  };

  // Submit do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/animes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          originalTitle: originalTitle || undefined,
          slug: slug || undefined,
          releaseYear: typeof releaseYear === 'number' ? releaseYear : undefined,
          status,
          posterUrl: posterUrl || undefined,
          bannerUrl: bannerUrl || undefined,
          description: description || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao cadastrar anime');
      }

      setSuccess('Anime cadastrado com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push(`/admin/animes/${data.anime.id}/editar`);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
      {/* Botão de Voltar */}
      <Link
        href="/admin/animes"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Voltar à Lista de Animes</span>
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div>
          <h1 className="text-2xl font-black text-white">Cadastrar Novo Anime</h1>
          <p className="text-xs text-gray-400">
            Insira o título e use a busca automática para importar capa e sinopse
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutofill}
          disabled={autofilling || !title.trim()}
          className="px-5 py-2.5 rounded-2xl bg-[#FF6B00]/20 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white border border-[#FF6B00]/30 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {autofilling ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>Preencher Automaticamente via MAL</span>
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Preview da Capa */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-gray-300">Preview da Capa</label>
          <div className="w-full aspect-[2/3] relative rounded-3xl overflow-hidden bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center p-4">
            {posterUrl ? (
              <SafeImage src={posterUrl} alt="Poster preview" fill className="object-cover" />
            ) : (
              <div className="space-y-2 text-gray-500">
                <ImageIcon size={36} className="mx-auto" />
                <p className="text-xs">Cole a URL do Poster para ver o preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Campos do Formulário */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Título do Anime <span className="text-[#FF6B00]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Jujutsu Kaisen"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .trim()
                    .replace(/\s+/g, '-')
                );
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Título Original (Japonês)</label>
              <input
                type="text"
                placeholder="Ex: 呪術廻戦"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Slug da URL</label>
              <input
                type="text"
                placeholder="ex: jujutsu-kaisen"
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
            <label className="block text-xs font-bold text-gray-300 mb-1">URL do Poster (Capa)</label>
            <input
              type="url"
              placeholder="https://cdn.myanimelist.net/images/anime/..."
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Sinopse / Descrição</label>
            <textarea
              rows={4}
              placeholder="Escreva a sinopse do anime..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Salvar Anime</span>
          </button>
        </div>
      </form>
    </div>
  );
}
