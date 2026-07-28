import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { Play, Calendar, Star, Film, Tv, Clock } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ animeId: string }>;
}) {
  const { animeId } = await params;

  const anime = await prisma.anime.findFirst({
    where: {
      OR: [{ id: animeId }, { slug: animeId }],
    },
    include: {
      episodes: {
        orderBy: [{ season: 'asc' }, { number: 'asc' }],
      },
    },
  });

  if (!anime) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-8 space-y-8">
      {/* Banner / Poster Header */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="w-48 sm:w-64 aspect-[2/3] relative rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10">
          <SafeImage
            src={anime.posterUrl || ''}
            alt={anime.title}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {anime.title}
          </h1>

          {anime.originalTitle && (
            <p className="text-sm font-semibold text-gray-400">
              {anime.originalTitle}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {anime.releaseYear && (
              <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <Calendar size={13} className="text-[#FF6B00]" />
                {anime.releaseYear}
              </span>
            )}
            {anime.status && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
                {anime.status}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
            {anime.description || 'Sem sinopse disponível no momento.'}
          </p>

          {anime.episodes.length > 0 && (
            <Link
              href={`/anime/${anime.id}/episode/${anime.episodes[0].id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black shadow-lg shadow-[#FF6B00]/30 transition-all hover:scale-105"
            >
              <Play size={18} fill="white" />
              <span>Começar a Assistir</span>
            </Link>
          )}
        </div>
      </div>

      {/* Lista de Episódios */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Film size={20} className="text-[#FF6B00]" />
          <span>Episódios ({anime.episodes.length})</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {anime.episodes.map((ep: { id: string; number: number; title: string | null; season: number }) => (
            <Link
              key={ep.id}
              href={`/anime/${anime.id}/episode/${ep.id}`}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center font-bold text-sm group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                  {ep.number}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors line-clamp-1">
                    {ep.title || `Episódio ${ep.number}`}
                  </h3>
                  <span className="text-xs text-gray-400">
                    Temporada {ep.season}
                  </span>
                </div>
              </div>
              <Play size={16} className="text-gray-400 group-hover:text-[#FF6B00] transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
