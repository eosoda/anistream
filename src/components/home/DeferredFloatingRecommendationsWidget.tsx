'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

const FloatingRecommendationsWidget = dynamic(
  () => import('./FloatingRecommendationsWidget').then(module => module.FloatingRecommendationsWidget),
  { ssr: false }
);

export function DeferredFloatingRecommendationsWidget() {
  const pathname = usePathname();
  const { recommendationsEnabled } = useFavorites();
  const [activated, setActivated] = useState(false);

  if (!recommendationsEnabled || pathname?.startsWith('/setup') || pathname?.startsWith('/admin')) {
    return null;
  }

  if (activated) {
    return <FloatingRecommendationsWidget initialOpen />;
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-40 lg:bottom-6 lg:right-6">
      <button
        onClick={() => setActivated(true)}
        aria-label="Abrir recomendações para você"
        className="group relative flex size-11 items-center justify-center rounded-full border border-white/15 bg-[#FF6B00] text-white shadow-[0_10px_30px_rgba(255,107,0,0.3)] transition-[transform,background-color,box-shadow] hover:bg-[#FF8533] active:scale-95 lg:size-auto lg:min-h-11 lg:gap-2.5 lg:px-4 lg:py-2.5"
      >
        <span className="relative flex items-center justify-center">
          <Sparkles size={18} />
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#FF6B00]" />
        </span>
        <span className="hidden text-sm font-black tracking-tight lg:inline">Para Você</span>
      </button>
    </div>
  );
}
