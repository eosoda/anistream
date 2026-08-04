'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Search,
  Download,
  Loader2,
  X,
  Sparkles,
  Film,
  CheckCircle2,
  AlertCircle,
  Star,
  Tv,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface ImportAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface KenjitsuSearchResult {
  malId?: number;
  anilistId?: number;
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  bannerUrl?: string;
  releaseYear?: number;
  status?: string;
  description?: string;
  episodesCount?: number;
  rating?: number;
  genres?: string;
}

export function ImportAnimeModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportAnimeModalProps) {
  const { panelRef, titleId } = useDialogAccessibility(isOpen, onClose);
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [results, setResults] = useState<KenjitsuSearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Busca instantânea com debounce (350ms)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(
          `/api/admin/animes/autofill?title=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();

        if (res.ok && Array.isArray(data.results)) {
          setResults(data.results);
        } else {
          setResults([]);
          setErrorMsg(data.error || 'Nenhum anime encontrado.');
        }
      } catch (err: any) {
        setResults([]);
        setErrorMsg('Erro ao conectar com a API de busca.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setErrorMsg(null);
      setLoading(false);
    }
  };

  const handleImport = async (item: KenjitsuSearchResult) => {
    const trackingId = item.malId ?? item.anilistId ?? -1;
    setImportingId(trackingId);
    try {
      const res = await fetch('/api/admin/animes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast({
          type: 'success',
          title: 'Anime Importado com Sucesso! 🎉',
          message: `${data.message} (${data.episodesCount} episódios no banco)`,
        });
        onSuccess();
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Falha na Importação',
          message: data.error || 'Não foi possível importar o anime.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erro de Conexão',
        message: err.message || 'Erro ao processar importação.',
      });
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-3xl glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl bg-[#0F0F17] space-y-6 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 id={titleId} className="text-xl font-black text-white">Importar Anime pelo Kenjitsu</h3>
              <p className="text-xs text-gray-400">
                Selecione um anime para importar metadados, capas e episódios para o PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar importação de anime"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            aria-label="Pesquisar anime para importar"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Digite o nome do anime (ex: Frieren, Naruto, One Piece)..."
            autoFocus
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00] transition-all text-sm font-medium"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FF6B00] animate-spin" size={18} />
          )}
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[250px]">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-2">
              <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
              <p className="text-xs">Consultando base global de animes...</p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 space-y-2">
              <Film size={36} className="text-white/20" />
              <p className="text-xs">Digite pelo menos 2 caracteres para pesquisar</p>
            </div>
          )}

          {results.map((item, idx) => {
            const trackingId = item.malId || item.anilistId || idx;
            const isImportingThis = importingId === trackingId;

            return (
              <div
                key={trackingId}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all gap-4 group"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      width={48}
                      height={64}
                      className="w-12 h-16 object-cover rounded-xl shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <Tv size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate group-hover:text-[#FF6B00] transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      {item.releaseYear && <span>{item.releaseYear}</span>}
                      {item.status && <span className="text-[#FF6B00] font-semibold">{item.status}</span>}
                      {item.episodesCount && <span className="text-gray-400 font-mono">({item.episodesCount} eps)</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 truncate max-w-md mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleImport(item)}
                  disabled={isImportingThis}
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-bold text-xs flex items-center gap-2 shrink-0 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
                >
                  {isImportingThis ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Importar</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
