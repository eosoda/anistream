'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, Download, CheckCircle2, Loader2, ChevronLeft, FileCode, Sparkles } from 'lucide-react';

type ImportedTitle = { title: string; status?: string };

function parseExport(content: string): ImportedTitle[] {
  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : parsed.data || parsed.anime || parsed.items || [];
    return items
      .map((item: any) => ({ title: item.title || item.name || item.anime_title || item.series_title, status: item.status || item.watching_status }))
      .filter((item: ImportedTitle) => Boolean(item.title));
  } catch {
    const document = new DOMParser().parseFromString(content, 'application/xml');
    return Array.from(document.querySelectorAll('anime')).flatMap((anime) => {
      const title = anime.querySelector('series_title, title')?.textContent?.trim();
      return title ? [{ title, status: anime.querySelector('my_status, status')?.textContent?.trim() }] : [];
    });
  }
}

export default function ImportWatchlistPage() {
  const [xmlContent, setXmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (result) => setXmlContent(String(result.target?.result || ''));
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!xmlContent.trim()) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const entries = parseExport(xmlContent);
      const resolved = await Promise.all(entries.map(async (entry) => {
        const response = await fetch(`/api/anime/search?q=${encodeURIComponent(entry.title)}&limit=1`, { cache: 'no-store' });
        const payload = await response.json();
        const item = payload.data?.[0];
        if (!response.ok || !item) return null;
        return {
          id: String(item.malId),
          title: item.title,
          posterUrl: item.posterUrl || '',
          status: entry.status === '1' ? 'watching' : entry.status === '2' ? 'completed' : 'plan_to_watch',
        };
      }));
      const favorites = resolved.filter(Boolean);
      localStorage.setItem('anistream_favorites', JSON.stringify(favorites));
      setSummary({ total: entries.length, imported: favorites.length });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nao foi possivel importar o arquivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      <Link href="/lista" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
        <ChevronLeft size={16} />
        <span>Voltar para Minha Lista</span>
      </Link>

      <div className="flex items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]"><Download size={28} /></div>
        <div>
          <h1 className="text-2xl font-black text-white">Importar lista exportada</h1>
          <p className="text-xs text-gray-400">O arquivo e lido localmente e cada titulo e resolvido pelo catalogo self-hosted Kenjitsu.</p>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">{error}</div>}
      {summary && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center space-y-2">
          <CheckCircle2 size={40} className="mx-auto" />
          <h3 className="text-lg font-bold text-white">Importacao concluida</h3>
          <p className="text-xs text-gray-300">Foram resolvidos {summary.imported} de {summary.total} titulos pelo Kenjitsu.</p>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><FileCode size={18} className="text-[#FF6B00]" />Upload de XML/JSON</h2>
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#FF6B00] rounded-2xl cursor-pointer bg-black/40 transition-all">
          <Upload size={32} className="text-[#FF6B00] mb-2" />
          <span className="text-xs font-bold text-gray-300">{fileName ? `Arquivo: ${fileName}` : 'Selecione seu arquivo .xml ou .json'}</span>
          <input type="file" accept=".xml,.json" onChange={handleFileUpload} className="hidden" />
        </label>
        <button type="button" onClick={handleImport} disabled={loading || !xmlContent.trim()} className="w-full py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Resolver titulos pelo Kenjitsu
        </button>
      </div>
    </div>
  );
}
