'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Search } from 'lucide-react';
import { KENJITSU_GENRE_IDS, QuickMultiFilter, type QuickFilterState } from '@/components/catalog/QuickMultiFilter';

interface HomepageQuickFiltersProps {
  title?: string;
}

export function HomepageQuickFilters({ title = 'Explore por filtro' }: HomepageQuickFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<QuickFilterState>({ genre: 'all', status: 'all', orderBy: 'popularity' });

  const goToSearch = () => {
    const params = new URLSearchParams();
    const genre = filters.genre && filters.genre !== 'all' ? KENJITSU_GENRE_IDS[filters.genre] : undefined;
    if (genre) params.set('genres', genre);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.orderBy && filters.orderBy !== 'popularity') params.set('orderBy', filters.orderBy);
    router.push(`/pesquisa${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="space-y-3 rounded-[var(--radius-panel)] border border-white/10 bg-neutral-900/80 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF6B00]">
          <Filter size={15} aria-hidden="true" />
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={goToSearch}
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-3 text-xs font-bold text-[#FFB27A] transition-colors hover:bg-[#FF6B00] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        >
          <Search size={14} aria-hidden="true" />
          Ver resultados
        </button>
      </div>
      <QuickMultiFilter
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ genre: 'all', status: 'all', orderBy: 'popularity' })}
      />
    </section>
  );
}

