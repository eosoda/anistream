'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Film, Flame, Heart, Home, ListFilter, Menu, Search, X, type LucideIcon } from 'lucide-react';
import { SearchBar } from '@/components/catalog/SearchBar';
import { useFavorites } from '@/hooks/useFavorites';
import { useVisiblePublicNavigation } from '@/components/navigation';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import type { NavDestinationId, NavItemConfig } from '@/types/navigation';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';
import { SafeImage } from '@/components/ui/SafeImage';

const iconMap: Record<NavDestinationId, LucideIcon> = {
  home: Home,
  popular: Flame,
  seasons: Calendar,
  calendar: Calendar,
  movies: Film,
  catalog: ListFilter,
  favorites: Heart,
};

function NavigationIcon({ item, size = 17 }: { item: NavItemConfig; size?: number }) {
  const Icon = iconMap[item.id];
  return <Icon size={size} aria-hidden="true" />;
}

export function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { favorites } = useFavorites();
  const { settings, items } = useVisiblePublicNavigation();
  const { config } = usePublicExperience();
  const mobileMoreItems = items.filter((item) => !settings.mobileBottomIds.includes(item.id));
  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color:rgba(9,10,14,.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-18 md:px-8">
          <Link href="/" prefetch={false} aria-label="AniStream — início" className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-control)] bg-[var(--accent)]">
              <SafeImage
                src={config.branding.logoLight}
                fallbackSrc="/icon.svg"
                alt={`${config.branding.appName} logo`}
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </span>
            <span className={`${config.branding.showMobileBrand ? '' : 'hidden min-[350px]:block'} font-black tracking-wider`}>
              {config.branding.brandText}
            </span>
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-colors ${isActive(item.href) ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)] hover:bg-white/6 hover:text-white'}`}
              >
                <NavigationIcon item={item} />
                {item.label}
                {item.id === 'favorites' && favorites.length > 0 && (
                  <span className="rounded-full bg-black/15 px-1.5 font-mono-data text-xs">{favorites.length}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden w-full max-w-sm md:block">
            <SearchBar isCompact />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button
              onClick={() => {
                setMobileSearchOpen((value) => !value);
                setMoreOpen(false);
              }}
              aria-label={mobileSearchOpen ? 'Fechar busca' : 'Abrir busca'}
              aria-expanded={mobileSearchOpen}
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-white/7 hover:text-white md:hidden"
            >
              {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            <button
              onClick={() => {
                setMoreOpen((value) => !value);
                setMobileSearchOpen(false);
              }}
              aria-label={moreOpen ? 'Fechar menu Mais' : 'Abrir menu Mais'}
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-white/7 hover:text-white lg:hidden"
            >
              {moreOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileSearchOpen && (
          <div className="border-t border-[var(--border-subtle)] p-3 md:hidden">
            <SearchBar placeholder="Buscar animes..." onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        )}
        {moreOpen && (
          <nav id="mobile-more-menu" aria-label="Mais destinos" className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 py-1 lg:hidden">
            <div className="mx-auto grid max-w-7xl grid-cols-3">
              {mobileMoreItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-xs font-medium ${isActive(item.href) ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/7 hover:text-white'}`}
                >
                  <NavigationIcon item={item} size={20} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <MobileBottomNav />
    </>
  );
}
