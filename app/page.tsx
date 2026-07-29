'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Star, Calendar, TrendingUp, Compass } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { anilistService } from '@/services/anilist';
import { BannerHero } from '@/components/home/BannerHero';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection';
import { JikanAnime } from '@/types/anime';
import { filterAnimeByAudio } from '@/utils/audioFilter';

export default function HomePage() {
  // 1. Temporada Atual (Season Now)
  const { data: seasonNowData, isLoading: isLoadingSeasonNow } = useQuery({
    queryKey: ['seasonNow'],
    queryFn: () => jikanService.getSeasonNow(1, 20),
  });

  // 2. Em Alta (Trending / Bypopularity)
  const { data: trendingData, isLoading: isLoadingTrending } = useQuery({
    queryKey: ['trendingAnime'],
    queryFn: () => jikanService.getTopAnime('tv', 'bypopularity', 1, 20),
  });

  // 3. Mais Populares (Top Overall)
  const { data: topAnimeData, isLoading: isLoadingTop } = useQuery({
    queryKey: ['topAnimeOverall'],
    queryFn: () => jikanService.getTopAnime('all', undefined, 1, 20),
  });

  // 4. Mais Bem Avaliados (Top Rated)
  const { data: topFavoriteData, isLoading: isLoadingFavorite } = useQuery({
    queryKey: ['topFavoriteAnime'],
    queryFn: () => jikanService.getTopAnime('tv', 'favorite', 1, 20),
  });

  // Hero items combining Season Now + High-res banners from AniList
  const { data: heroAnimes, isLoading: isLoadingHero } = useQuery({
    queryKey: ['heroBanners', seasonNowData?.data],
    queryFn: async () => {
      if (!seasonNowData?.data || seasonNowData.data.length === 0) return [];
      const topItems = seasonNowData.data.slice(0, 5);

      // Enhance with AniList high-res banners in parallel
      const enhanced = await Promise.all(
        topItems.map(async (anime) => {
          try {
            const aniMedia = await anilistService.getMediaByMalId(anime.mal_id);
            if (aniMedia?.bannerImage) {
              return { ...anime, bannerImage: aniMedia.bannerImage };
            }
          } catch (e) {
            // fallback gracefully
          }
          return anime;
        })
      );
      return enhanced;
    },
    enabled: !!seasonNowData?.data,
  });

  const [activeFilter, setActiveFilter] = React.useState<'all' | 'dubbed' | 'subbed' | 'trending'>('all');

  const filterAnimes = (animes: JikanAnime[]) => {
    if (!animes) return [];
    if (activeFilter === 'all') return animes;
    if (activeFilter === 'dubbed') {
      return filterAnimeByAudio(animes, 'dubbed_pt');
    }
    if (activeFilter === 'subbed') {
      return filterAnimeByAudio(animes, 'subbed_pt');
    }
    if (activeFilter === 'trending') {
      return animes.filter((a) => (a.score || 0) >= 7.8 || (a.popularity || 9999) < 500);
    }
    return animes;
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Hero Banner Section */}
      <BannerHero
        animes={heroAnimes || seasonNowData?.data?.slice(0, 5) || []}
        isLoading={isLoadingSeasonNow || isLoadingHero}
      />

      {/* Main Content Sections */}
      <div id="main-content" className="max-w-7xl mx-auto px-2 space-y-8 scroll-mt-20 md:scroll-mt-24">
        {/* Quick Multi-Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 border-b border-white/10 pb-4">
          {[
            { id: 'all', label: '✨ Todos os Animes' },
            { id: 'dubbed', label: '🎙️ Dublados' },
            { id: 'subbed', label: '🇯🇵 Legendados' },
            { id: 'trending', label: '🔥 Em Alta (Nota 8+)' },
          ].map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-[#FF6B00]/40 scale-105'
                    : 'glass-panel hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Continue Watching Section */}
        <ContinueWatchingSection />

        {/* Section 1: Em Alta (Trending) */}
        <AnimeCarousel
          title="Em Alta"
          subtitle="Os animes mais comentados e assistidos do momento"
          icon={<Flame size={22} className="text-[#FF6B00]" />}
          animes={filterAnimes(trendingData?.data || [])}
          isLoading={isLoadingTrending}
          viewAllHref="/populares"
        />

        {/* Section 2: Temporada Atual */}
        <AnimeCarousel
          title="Temporada Atual"
          subtitle="Episódios semanais sendo exibidos agora no Japão"
          icon={<Calendar size={22} className="text-[#FF6B00]" />}
          animes={filterAnimes(seasonNowData?.data || [])}
          isLoading={isLoadingSeasonNow}
          viewAllHref="/temporadas"
        />

        {/* Section 3: Mais Populares */}
        <AnimeCarousel
          title="Mais Populares"
          subtitle="Os clássicos e grandes sucessos aclamados pela comunidade"
          icon={<TrendingUp size={22} className="text-[#FF6B00]" />}
          animes={filterAnimes(topAnimeData?.data || [])}
          isLoading={isLoadingTop}
          viewAllHref="/populares"
        />

        {/* Section 4: Mais Bem Avaliados */}
        <AnimeCarousel
          title="Mais Bem Avaliados"
          subtitle="Títulos com as maiores notas e qualificações de fãs"
          icon={<Star size={22} className="text-[#FF6B00]" />}
          animes={filterAnimes(topFavoriteData?.data || [])}
          isLoading={isLoadingFavorite}
          viewAllHref="/populares"
        />

        {/* Section 5: Recomendações em Destaque */}
        <AnimeCarousel
          title="Recomendações Imperdíveis"
          subtitle="Seleção especial recomendada pela comunidade otaku"
          icon={<Compass size={22} className="text-[#FF6B00]" />}
          animes={filterAnimes(seasonNowData?.data?.slice(5, 20) || [])}
          isLoading={isLoadingSeasonNow}
        />
      </div>
    </div>
  );
}
