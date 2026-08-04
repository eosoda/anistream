'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Film, Flame, Heart, Home, ListFilter, Search, type LucideIcon } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useVisiblePublicNavigation } from '@/components/navigation';
import type { NavDestinationId, NavItemConfig } from '@/types/navigation';

const iconMap: Record<NavDestinationId, LucideIcon> = { home: Home, popular: Flame, seasons: Calendar, calendar: Calendar, movies: Film, catalog: ListFilter, favorites: Heart };

export function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites, newEpisodesCount } = useFavorites();
  const { settings, items } = useVisiblePublicNavigation();
  const itemById = new Map(items.map((item) => [item.id, item]));
  const selected = settings.mobileBottomIds.map((id) => itemById.get(id)).filter((item): item is NavItemConfig => Boolean(item));
  const navItems = [selected[0], null, selected[1], selected[2]];
  const isActive = (href: string) => pathname === href;

  return (
    <nav aria-label="Navegação móvel" className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[var(--border-subtle)] bg-[color:rgba(9,10,14,.94)] px-2 pt-1 backdrop-blur-xl lg:hidden">
      {navItems.map((item, index) => item ? (() => {
        const Icon = iconMap[item.id];
        const active = isActive(item.href);
        return <Link key={item.id} href={item.href} prefetch={false} aria-current={active ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/7 hover:text-white'}`}>
          <span className="relative"><Icon size={20} aria-hidden="true" />{item.id === 'favorites' && newEpisodesCount > 0 && <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-[var(--success)] px-1 text-center font-mono-data text-[10px] text-black">{newEpisodesCount}</span>}</span>
          <span className="max-w-full truncate">{item.label}</span>
        </Link>;
      })() : <Link key={`search-${index}`} href="/pesquisa" prefetch={false} aria-current={pathname === '/pesquisa' ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${pathname === '/pesquisa' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/7 hover:text-white'}`}><Search size={20} aria-hidden="true" /><span>Buscar</span></Link>)}
    </nav>
  );
}
