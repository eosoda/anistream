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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
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

  // Instant debounced search - exactly 5 top results
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        setIsLoading(false);
        setIsOpen(false);
        setSelectedIndex(-1);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const response = await jikanService.searchAnime(query, 1, 5);
        setResults(response.data?.slice(0, 5) || []);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Erro na pesquisa:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    if (isOpen && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        return;
      }
    }

    if (e.key === 'Enter') {
      if (isOpen && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        const targetAnime = results[selectedIndex];
        setIsOpen(false);
        router.push(`/anime/${targetAnime.mal_id}`);
      } else if (query.trim()) {
        setIsOpen(false);
        router.push(`/pesquisa?q=${encodeURIComponent(query.trim())}`);
      }
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
          {/* Voice Search Mic Button */}
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
                    setSelectedIndex(-1);
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

      {/* Instant Live Search Preview Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-panel bg-[#0B0B0F]/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/15 divide-y divide-white/5 animate-fade-in">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#FF6B00]" />
              Buscando animes...
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B00] bg-white/5 flex items-center justify-between">
                <span>Pré-visualização instantânea (Top 5)</span>
                <span className="text-gray-400 font-normal">Use ↑ ↓ e Enter</span>
              </div>

              {results.map((anime, idx) => {
                const imageUrl =
                  anime.images?.jpg?.small_image_url || anime.images?.jpg?.image_url;
                const title = anime.title || anime.title_english || 'Anime';
                const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'N/A');
                const isSelected = selectedIndex === idx;

                return (
                  <Link
                    key={anime.mal_id}
                    href={`/anime/${anime.mal_id}`}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 p-2.5 transition-colors group ${
                      isSelected ? 'bg-[#FF6B00]/20 border-l-4 border-[#FF6B00]' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="relative w-11 h-15 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 border border-white/10 shadow-sm">
                      <SafeImage
                        src={imageUrl}
                        fallbackSrc={anime.images?.jpg?.image_url}
                        animeId={anime.mal_id}
                        alt={title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4
                        className={`text-xs sm:text-sm font-bold transition-colors truncate ${
                          isSelected ? 'text-[#FF6B00]' : 'text-white group-hover:text-[#FF6B00]'
                        }`}
                      >
                        {title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 flex-wrap">
                        {anime.score && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                            <Star size={11} className="fill-current" />
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
                        <span className="text-gray-300 font-medium">{formatStatus(anime.status)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link
                href={`/pesquisa?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setIsOpen(false)}
                className="block p-3 text-center text-xs font-bold text-[#FF6B00] bg-white/5 hover:bg-[#FF6B00]/10 transition-colors"
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
