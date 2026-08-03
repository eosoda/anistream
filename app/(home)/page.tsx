'use client';

import { Flame, Star, Calendar, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BannerHero } from '@/components/home/BannerHero';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection';
import { DeferredHomeCarousel } from '@/components/home/DeferredHomeCarousel';
import { kenjitsuService } from '@/services/kenjitsu';

export default function HomePage() {
  const trendingQuery = useQuery({
    queryKey: ['home', 'trending'],
    queryFn: () => kenjitsuService.getTopAnime('trending', undefined, 1, 12),
    staleTime: 5 * 60 * 1000,
  });
  const seasonQuery = useQuery({
    queryKey: ['home', 'airing'],
    queryFn: () => kenjitsuService.getSeasonNow(1, 12),
    staleTime: 5 * 60 * 1000,
  });
  const popularQuery = useQuery({
    queryKey: ['home', 'popular'],
    queryFn: () => kenjitsuService.getTopAnime('popular', undefined, 1, 12),
    staleTime: 5 * 60 * 1000,
  });
  const ratedQuery = useQuery({
    queryKey: ['home', 'rating'],
    queryFn: () => kenjitsuService.getTopAnime('rating', undefined, 1, 12),
    staleTime: 5 * 60 * 1000,
  });

  const trending = trendingQuery.data?.data || [];
  const season = seasonQuery.data?.data || [];
  const popular = popularQuery.data?.data || [];
  const rated = ratedQuery.data?.data || [];

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Hero Banner Section */}
      <BannerHero
        animes={trending.slice(0, 5)}
        isLoading={trendingQuery.isLoading}
      />

      {/* Main Content Sections */}
      <div id="main-content" className="max-w-7xl mx-auto px-2 space-y-8 scroll-mt-20 md:scroll-mt-24">
        {/* Continue Watching Section */}
        <ContinueWatchingSection />

        {/* Section 1: Em Alta (Trending) */}
        <AnimeCarousel
          title="Em Alta"
          subtitle="Os animes mais comentados e assistidos do momento"
          icon={<Flame size={22} className="text-[#FF6B00]" />}
          animes={trending.slice(0, 8)}
          isLoading={trendingQuery.isLoading}
          viewAllHref="/populares"
        />

        {/* Section 2: Temporada Atual */}
        <DeferredHomeCarousel
          title="Temporada Atual"
          subtitle="Episódios semanais sendo exibidos agora no Japão"
          icon={<Calendar size={22} className="text-[#FF6B00]" />}
          animes={season}
          queryFn={() => kenjitsuService.getSeasonNow(1, 12)}
          viewAllHref="/temporadas"
        />

        {/* Section 3: Mais Populares */}
        <DeferredHomeCarousel
          title="Mais Populares"
          subtitle="Os clássicos e grandes sucessos aclamados pela comunidade"
          icon={<TrendingUp size={22} className="text-[#FF6B00]" />}
          animes={popular}
          queryFn={() => kenjitsuService.getTopAnime('popular', undefined, 1, 12)}
          viewAllHref="/populares"
        />

        {/* Section 4: Mais Bem Avaliados */}
        <DeferredHomeCarousel
          title="Mais Bem Avaliados"
          subtitle="Títulos com as maiores notas e qualificações de fãs"
          icon={<Star size={22} className="text-[#FF6B00]" />}
          animes={rated}
          queryFn={() => kenjitsuService.getTopAnime('rating', undefined, 1, 12)}
          viewAllHref="/populares"
        />

      </div>
    </div>
  );
}
