'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { VideoPlayer, SubtitleTrack } from '@/components/VideoPlayer';

export default function EpisodePage({
  params,
}: {
  params: Promise<{ animeId: string; episodeId: string }>;
}) {
  const { animeId, episodeId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);

  useEffect(() => {
    async function resolveStream() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/streams/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeId,
            season: 1,
            episode: 1,
            preferredAudio: 'pt-BR',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Nenhuma fonte autorizada disponível.');
        }

        const data = await res.json();
        setPlaybackUrl(data.playbackUrl);
        setSubtitles(data.subtitles || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    resolveStream();
  }, [animeId, episodeId]);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Botão de Voltar */}
      <Link
        href={`/anime/${animeId}`}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Voltar aos Detalhes do Anime</span>
      </Link>

      {/* Conteúdo do Player */}
      {loading ? (
        <div className="w-full aspect-video rounded-3xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
          <p className="text-xs font-bold text-gray-400">
            Resolvendo fonte de stream autorizada...
          </p>
        </div>
      ) : error ? (
        <div className="w-full aspect-video rounded-3xl bg-neutral-900 border border-red-500/20 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={40} className="text-red-400 mb-2" />
          <h3 className="text-base font-bold text-white mb-1">
            Indisponível no Momento
          </h3>
          <p className="text-xs text-gray-400 max-w-md">{error}</p>
        </div>
      ) : playbackUrl ? (
        <VideoPlayer
          playbackUrl={playbackUrl}
          subtitles={subtitles}
        />
      ) : null}
    </div>
  );
}
