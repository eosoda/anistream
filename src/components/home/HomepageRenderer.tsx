'use client';

import Link from 'next/link';
import { AlertTriangle, Minus } from 'lucide-react';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { BannerHero } from '@/components/home/BannerHero';
import { ContinueWatchingSection } from '@/components/home/ContinueWatchingSection';
import { HomepageEditorialNotice } from '@/components/home/HomepageEditorialNotice';
import { HomepageQuickFilters } from '@/components/home/HomepageQuickFilters';
import type { HomepageBlock, HomepageLayoutDocument, HomepageResolvedBlock } from '@/types/homepage';

interface HomepageRendererProps {
  document: HomepageLayoutDocument;
  blocks: HomepageResolvedBlock[];
  preview?: boolean;
}

const frameClasses = {
  content: 'mx-auto w-full max-w-7xl px-2 md:px-4',
  wide: 'mx-auto w-full max-w-[88rem] px-2 md:px-4',
  full: 'w-full',
} as const;

const spacingClasses = {
  compact: 'my-3',
  normal: 'my-6 md:my-8',
  airy: 'my-10 md:my-14',
} as const;

function HomeBlockState({ result }: { result?: HomepageResolvedBlock }) {
  if (!result || result.status === 'ready' || result.status === 'client') return null;
  if (result.status === 'empty') {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border border-white/10 bg-white/[0.03] px-4 text-center text-xs text-gray-400">
        <p>Nenhum conteúdo disponível nesta seção.</p>
        {result.error && <p className="text-[11px] text-gray-500">{result.error}</p>}
      </div>
    );
  }
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border border-amber-400/25 bg-amber-400/[0.06] px-4 text-center text-xs text-amber-100" role="status">
      <AlertTriangle size={18} aria-hidden="true" />
      <p>Esta seção está temporariamente indisponível.</p>
      <Link href="/" className="font-bold underline underline-offset-4">Tentar novamente</Link>
    </div>
  );
}

function renderBlock(block: HomepageBlock, result: HomepageResolvedBlock | undefined, preview: boolean) {
  if (block.type === 'hero') {
    if (result?.status !== 'ready' || !result.data?.length) return <HomeBlockState result={result} />;
    return (
      <BannerHero
        animes={result.data}
        autoplay={block.autoplay}
        titleOverride={block.titleOverride}
        subtitleOverride={block.subtitleOverride}
      />
    );
  }

  if (block.type === 'catalog_carousel') {
    if (result?.status === 'error') return <HomeBlockState result={result} />;
    return (
      <>
        <AnimeCarousel
          title={block.title}
          subtitle={block.subtitle}
          animes={result?.data || []}
          viewAllHref={block.ctaHref}
          viewAllLabel={block.ctaLabel}
        />
        {result?.error && result.status === 'ready' && <p className="mt-2 text-center text-[11px] text-gray-500">Alguns títulos desta seção não estão disponíveis no Kenjitsu.</p>}
      </>
    );
  }

  if (block.type === 'continue_watching') return <ContinueWatchingSection title={block.title} preview={preview} />;
  if (block.type === 'quick_filters') return <HomepageQuickFilters title={block.title} />;
  if (block.type === 'editorial_notice') return <HomepageEditorialNotice block={block} />;
  return (
    <div className="flex items-center gap-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
      <Minus size={16} aria-hidden="true" />
      {block.label && <span>{block.label}</span>}
    </div>
  );
}

export function HomepageRenderer({ document, blocks, preview = false }: HomepageRendererProps) {
  const results = new Map(blocks.map((result) => [result.id, result]));
  const visibleBlocks = document.blocks.filter((block) => block.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="w-full space-y-1 pb-12" data-homepage-source={preview ? 'draft' : 'published'}>
      {visibleBlocks.map((block) => (
        <section
          key={block.id}
          data-homepage-block={block.type}
          data-homepage-block-id={block.id}
          className={`${frameClasses[block.frame.width]} ${spacingClasses[block.frame.spacing]}`}
        >
          {renderBlock(block, results.get(block.id), preview)}
        </section>
      ))}
    </div>
  );
}
