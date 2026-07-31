'use client';

import React from 'react';
import { Flame, Star, Calendar, TrendingUp, Compass } from 'lucide-react';
import { BannerHero } from '@/components/home/BannerHero';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection';
import { DeferredHomeCarousel } from '@/components/home/DeferredHomeCarousel';
import { FALLBACK_ANIMES } from '@/data/fallbackAnime';

async function loadPopularAnime() {
  const { jikanService } = await import('@/services/jikan');
  return jikanService.getTopAnime('all', undefined, 1, 8);
}

async function loadFavoriteAnime() {
  const { jikanService } = await import('@/services/jikan');
  return jikanService.getTopAnime('tv', 'favorite', 1, 8);
}

export default function HomePage() {
  const [shouldLoadRemoteCatalog, setShouldLoadRemoteCatalog] = React.useState(false);
  const [seasonAnimes, setSeasonAnimes] = React.useState(() => FALLBACK_ANIMES.slice(0, 12));
  const [trendingAnimes, setTrendingAnimes] = React.useState(() => FALLBACK_ANIMES.slice(0, 8));

  React.useEffect(() => {
    const activate = () => setShouldLoadRemoteCatalog(true);
    const options: AddEventListenerOptions = { passive: true, once: true };
    window.addEventListener('scroll', activate, options);
    window.addEventListener('pointerdown', activate, options);
    window.addEventListener('keydown', activate, { once: true });
    const fallbackTimer = window.setTimeout(activate, 30000);

    return () => {
      window.removeEventListener('scroll', activate);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  React.useEffect(() => {
    if (!shouldLoadRemoteCatalog) return;
    let active = true;

    import('@/services/jikan').then(async ({ jikanService }) => {
      const [seasonResult, trendingResult] = await Promise.allSettled([
        jikanService.getSeasonNow(1, 12),
        jikanService.getTopAnime('tv', 'bypopularity', 1, 8),
      ]);

      if (!active) return;
      if (seasonResult.status === 'fulfilled' && seasonResult.value.data?.length) {
        setSeasonAnimes(seasonResult.value.data.slice(0, 12));
      }
      if (trendingResult.status === 'fulfilled' && trendingResult.value.data?.length) {
        setTrendingAnimes(trendingResult.value.data.slice(0, 8));
      }
    });

    return () => {
      active = false;
    };
  }, [shouldLoadRemoteCatalog]);

  const [initialHeroAnimes] = React.useState(
    () => FALLBACK_ANIMES.slice(0, 5)
  );

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Hero Banner Section */}
      <BannerHero
        animes={initialHeroAnimes}
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
          animes={trendingAnimes}
          isLoading={false}
          viewAllHref="/populares"
        />

        {/* Section 2: Temporada Atual */}
        <DeferredHomeCarousel
          title="Temporada Atual"
          subtitle="Episódios semanais sendo exibidos agora no Japão"
          icon={<Calendar size={22} className="text-[#FF6B00]" />}
          animes={seasonAnimes}
          viewAllHref="/temporadas"
        />

        {/* Section 3: Mais Populares */}
        <DeferredHomeCarousel
          title="Mais Populares"
          subtitle="Os clássicos e grandes sucessos aclamados pela comunidade"
          icon={<TrendingUp size={22} className="text-[#FF6B00]" />}
          queryFn={loadPopularAnime}
          viewAllHref="/populares"
        />

        {/* Section 4: Mais Bem Avaliados */}
        <DeferredHomeCarousel
          title="Mais Bem Avaliados"
          subtitle="Títulos com as maiores notas e qualificações de fãs"
          icon={<Star size={22} className="text-[#FF6B00]" />}
          queryFn={loadFavoriteAnime}
          viewAllHref="/populares"
        />

        {/* Section 5: Recomendações em Destaque */}
        <DeferredHomeCarousel
          title="Recomendações Imperdíveis"
          subtitle="Seleção especial recomendada pela comunidade otaku"
          icon={<Compass size={22} className="text-[#FF6B00]" />}
          animes={seasonAnimes.slice(5, 12)}
        />
      </div>
    </div>
  );
}
