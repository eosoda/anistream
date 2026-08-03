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

  return (
    <nav aria-label="Navegação móvel" className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-white/10 bg-[#0B0B0F]/95 px-2 pt-1 backdrop-blur-xl lg:hidden">
      {navItems.map((item, index) => item ? (() => { const Icon = iconMap[item.id]; const active = pathname === item.href; return <Link key={item.id} href={item.href} aria-current={active ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${active ? 'text-[#FF6B00]' : 'text-gray-400'}`}><span className="relative"><Icon size={20} aria-hidden="true" />{item.id === 'favorites' && newEpisodesCount > 0 && <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-emerald-500 px-1 text-center text-[10px] text-black">{newEpisodesCount}</span>}</span><span className="max-w-full truncate">{item.label}</span></Link>; })() : <Link key="search" href="/pesquisa" aria-current={pathname === '/pesquisa' ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${pathname === '/pesquisa' ? 'text-[#FF6B00]' : 'text-gray-400'}`}><Search size={20} aria-hidden="true" /><span>Buscar</span></Link>)}
    </nav>
  );
}
