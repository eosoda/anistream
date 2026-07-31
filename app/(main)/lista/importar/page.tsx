'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  FileCode,
  User,
  Sparkles,
} from 'lucide-react';

export default function ImportWatchlistPage() {
  const [username, setUsername] = useState('');
  const [xmlContent, setXmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Importar por Nome de Usuário do MyAnimeList
  const handleImportByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch(`https://api.jikan.moe/v4/users/${encodeURIComponent(username.trim())}/animelist`);
      if (!res.ok) {
        throw new Error('Usuário não encontrado no MyAnimeList ou lista privada.');
      }

      const data = await res.json();
      const items = data.data || [];

      // Salvar no LocalStorage / FavoritesContext
      const favorites = items.map((item: any) => ({
        id: item.anime?.mal_id?.toString() || Math.random().toString(),
        title: item.anime?.title || 'Anime',
        posterUrl: item.anime?.images?.jpg?.large_image_url || '',
        status: item.watching_status === 1 ? 'watching' : item.watching_status === 2 ? 'completed' : 'plan_to_watch',
      }));

      localStorage.setItem('anistream_favorites', JSON.stringify(favorites));

      setSummary({
        total: items.length,
        imported: items.length,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Importar por Upload de Arquivo XML
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setXmlContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      {/* Botão de Voltar */}
      <Link
        href="/lista"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Voltar à Minha Lista</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Download size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Importar Lista do MyAnimeList</h1>
            <p className="text-xs text-gray-400">
              Sincronize seus animes salvos informando seu usuário do MAL ou enviando seu arquivo exportado
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {summary && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center space-y-2">
          <CheckCircle2 size={40} className="mx-auto" />
          <h3 className="text-lg font-bold text-white">Importação Concluída!</h3>
          <p className="text-xs text-gray-300">
            Foram importados {summary.imported} de {summary.total} animes para a sua lista pessoal do AniStream.
          </p>
        </div>
      )}

      {/* Opção 1: Nome de Usuário */}
      <form onSubmit={handleImportByUsername} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User size={18} className="text-[#FF6B00]" />
          <span>Opção 1: Importar por Nome de Usuário MyAnimeList</span>
        </h2>

        <div>
          <label htmlFor="mal-username" className="block text-xs font-bold text-gray-300 mb-1">Nome de Usuário MAL</label>
          <input id="mal-username"
            type="text"
            required
            placeholder="Ex: otaku_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Sparkles size={16} />
              <span>Sincronizar Lista do MAL</span>
            </>
          )}
        </button>
      </form>

      {/* Opção 2: Upload de Arquivo XML */}
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCode size={18} className="text-[#FF6B00]" />
          <span>Opção 2: Upload de Arquivo XML/JSON de Exportação</span>
        </h2>

        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#FF6B00] rounded-2xl cursor-pointer bg-black/40 transition-all">
          <Upload size={32} className="text-[#FF6B00] mb-2" />
          <span className="text-xs font-bold text-gray-300">
            {fileName ? `Arquivo: ${fileName}` : 'Clique para selecionar arquivo .xml ou .json'}
          </span>
          <input type="file" accept=".xml,.json" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    </div>
  );
}
