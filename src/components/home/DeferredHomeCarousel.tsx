'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { JikanAnime } from '@/types/anime';

interface DeferredHomeCarouselProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  viewAllHref?: string;
  animes?: JikanAnime[];
  queryFn?: () => Promise<{ data: JikanAnime[] }>;
}

export function DeferredHomeCarousel({
  title,
  subtitle,
  icon,
  viewAllHref,
  animes,
  queryFn,
}: DeferredHomeCarouselProps) {
  const hostRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loadedItems, setLoadedItems] = useState<JikanAnime[] | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !queryFn) return;

    let active = true;
    queryFn()
      .then(result => {
        if (active) setLoadedItems(result.data || []);
      })
      .catch(() => {
        if (active) setLoadedItems([]);
      });

    return () => {
      active = false;
    };
  }, [isVisible, queryFn]);

  const items = queryFn ? loadedItems || [] : animes || [];
  const isLoading = Boolean(queryFn && isVisible && loadedItems === null);

  return (
    <section
      ref={hostRef}
      className="min-h-[390px]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '390px' }}
    >
      {isVisible && (
        <AnimeCarousel
          title={title}
          subtitle={subtitle}
          icon={icon}
          animes={items.slice(0, 8)}
          isLoading={Boolean(queryFn) && isLoading}
          viewAllHref={viewAllHref}
        />
      )}
    </section>
  );
}
