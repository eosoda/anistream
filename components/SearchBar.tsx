'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, Star, Tv, Mic, MicOff } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { JikanAnime } from '@/types/anime';
import { formatStatus } from '@/utils/formatters';
import { SafeImage } from './SafeImage';
import { Tooltip } from './Tooltip';

interface SearchBarProps {
  placeholder?: string;
  isCompact?: boolean;
}

export function SearchBar({ placeholder = 'Buscar animes...', isCompact = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Web Speech API Voice Search
  const toggleVoiceSearch = () => {
    setSpeechError(null);

    // Check window / browser support for SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Reconhecimento de voz não suportado neste navegador.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Permissão para microfone negada.');
        } else if (event.error === 'no-speech') {
          setSpeechError('Nenhuma fala detectada. Tente novamente.');
        } else {
          setSpeechError('Erro no reconhecimento de voz.');
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
      setSpeechError('Não foi possível iniciar o microfone.');
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  // Instant debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        setIsLoading(false);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const response = await jikanService.searchAnime(query, 1, 6);
        setResults(response.data || []);
      } catch (err) {
        console.error('Erro na pesquisa:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      router.push(`/pesquisa?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <Search
          size={18}
          className="absolute left-3.5 text-gray-400 pointer-events-none group-focus-within:text-[#FF6B00] transition-colors"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Ouvindo sua voz...' : placeholder}
          className={`w-full pl-10 pr-20 bg-white/5 border transition-all rounded-full text-white placeholder-gray-400 focus:outline-none ${
            isListening
              ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/5'
              : 'border-white/10 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]'
          } ${isCompact ? 'py-1.5 text-xs' : 'py-2.5 text-sm'}`}
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {/* Voice Search Mic Button with Pulsing Ring */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/70 animate-ping" />
                <span className="absolute -inset-1 rounded-full bg-red-500/40 animate-pulse blur-xs" />
              </>
            )}
            <Tooltip content={isListening ? 'Parar escuta' : 'Pesquisar por voz'} position="bottom">
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`relative z-10 p-1.5 rounded-full transition-all flex items-center justify-center ${
                  isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 scale-105'
                    : 'text-gray-400 hover:text-[#FF6B00] hover:bg-white/10'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </Tooltip>
          </div>

          {isLoading ? (
            <Loader2 size={16} className="text-[#FF6B00] animate-spin" />
          ) : (
            query && (
              <Tooltip content="Limpar busca" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setIsOpen(false);
                  }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </Tooltip>
            )
          )}
        </div>
      </div>

      {/* Speech Error Banner */}
      {speechError && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2.5 rounded-xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs font-semibold shadow-xl backdrop-blur-md animate-fade-in text-center">
          {speechError}
        </div>
      )}

      {/* Autocomplete Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-panel rounded-2xl shadow-2xl overflow-hidden border border-white/10 divide-y divide-white/5">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#FF6B00]" />
              Procurando...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((anime) => {
                const imageUrl =
                  anime.images?.jpg?.small_image_url || anime.images?.jpg?.image_url;
                const title = anime.title || anime.title_english || 'Anime';
                const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'N/A');

                return (
                  <Link
                    key={anime.mal_id}
                    href={`/anime/${anime.mal_id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 hover:bg-[#FF6B00]/10 transition-colors group"
                  >
                    <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden bg-neutral-800">
                      <SafeImage
                        src={imageUrl}
                        fallbackSrc={anime.images?.jpg?.image_url}
                        animeId={anime.mal_id}
                        alt={title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#FF6B00] transition-colors truncate">
                        {title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
                        {anime.score && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                            <Star size={12} className="fill-current" />
                            {anime.score.toFixed(1)}
                          </span>
                        )}
                        <span>•</span>
                        <span>{year}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Tv size={10} />
                          {anime.type || 'TV'}
                        </span>
                        <span>•</span>
                        <span className="text-gray-300">{formatStatus(anime.status)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link
                href={`/pesquisa?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setIsOpen(false)}
                className="block p-3 text-center text-xs font-semibold text-[#FF6B00] bg-white/5 hover:bg-white/10 transition-colors"
              >
                Ver todos os resultados para &quot;{query}&quot; →
              </Link>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-400">
              Nenhum anime encontrado para &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
