import React from 'react';

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col w-full rounded-xl overflow-hidden glass-panel animate-pulse">
      <div className="aspect-[2/3] w-full bg-white/5 relative" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-white/5 rounded w-1/3" />
          <div className="w-6 h-6 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export function BannerHeroSkeleton() {
  return (
    <div className="w-full h-[60vh] md:h-[75vh] bg-white/5 animate-pulse relative rounded-b-3xl overflow-hidden flex items-end p-6 md:p-12">
      <div className="max-w-2xl space-y-4">
        <div className="h-4 bg-white/10 rounded w-32" />
        <div className="h-10 bg-white/10 rounded w-3/4" />
        <div className="h-16 bg-white/5 rounded w-full" />
        <div className="flex gap-4 pt-4">
          <div className="h-12 w-36 bg-white/10 rounded-full" />
          <div className="h-12 w-36 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 animate-pulse">
      <div className="h-80 w-full bg-white/5 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="h-96 bg-white/10 rounded-2xl" />
        <div className="lg:col-span-3 space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-white/5 rounded w-1/4" />
          <div className="h-32 bg-white/5 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

export function AnimeGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      role="status"
      aria-live="polite"
      aria-label="Carregando catálogo"
    >
      {Array.from({ length: count }).map((_, index) => (
        <AnimeCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function AnimeListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label="Carregando catálogo">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

export function CatalogPageSkeleton({ count = 24 }: { count?: number }) {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8" aria-busy="true">
      <div className="space-y-3 border-b border-white/10 pb-4" aria-hidden="true">
        <div className="h-8 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />
      <AnimeGridSkeleton count={count} />
    </main>
  );
}
