'use client';

import { Flame, Star, Calendar, TrendingUp } from 'lucide-react';
import { BannerHero } from '@/components/home/BannerHero';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection';
import { DeferredHomeCarousel } from '@/components/home/DeferredHomeCarousel';
import { FALLBACK_ANIMES } from '@/data/fallbackAnime';

const HERO_ANIMES = FALLBACK_ANIMES.slice(0, 5);
const TRENDING_ANIMES = FALLBACK_ANIMES.slice(0, 8);
const SEASON_ANIMES = FALLBACK_ANIMES.slice(0, 12);
const POPULAR_ANIMES = FALLBACK_ANIMES.slice(0, 8);
const TOP_RATED_ANIMES = [...FALLBACK_ANIMES]
  .sort((a, b) => (b.score || 0) - (a.score || 0))
  .slice(0, 8);

export default function HomePage() {
  return (
    <div className="w-full space-y-4 pb-12">
      {/* Hero Banner Section */}
      <BannerHero
        animes={HERO_ANIMES}
        isLoading={false}
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
          animes={TRENDING_ANIMES}
          isLoading={false}
          viewAllHref="/populares"
        />

        {/* Section 2: Temporada Atual */}
        <DeferredHomeCarousel
          title="Temporada Atual"
          subtitle="Episódios semanais sendo exibidos agora no Japão"
          icon={<Calendar size={22} className="text-[#FF6B00]" />}
          animes={SEASON_ANIMES}
          viewAllHref="/temporadas"
        />

        {/* Section 3: Mais Populares */}
        <DeferredHomeCarousel
          title="Mais Populares"
          subtitle="Os clássicos e grandes sucessos aclamados pela comunidade"
          icon={<TrendingUp size={22} className="text-[#FF6B00]" />}
          animes={POPULAR_ANIMES}
          viewAllHref="/populares"
        />

        {/* Section 4: Mais Bem Avaliados */}
        <DeferredHomeCarousel
          title="Mais Bem Avaliados"
          subtitle="Títulos com as maiores notas e qualificações de fãs"
          icon={<Star size={22} className="text-[#FF6B00]" />}
          animes={TOP_RATED_ANIMES}
          viewAllHref="/populares"
        />

      </div>
    </div>
  );
}
