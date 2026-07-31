'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Flame, Calendar, Film, ListFilter, Heart, Menu, X, Search, Home } from 'lucide-react';
import { SearchBar } from '@/components/catalog/SearchBar';
import { useFavorites } from '@/hooks/useFavorites';

const links = [
  { name: 'Início', href: '/', Icon: Home },
  { name: 'Populares', href: '/populares', Icon: Flame },
  { name: 'Calendário', href: '/calendario', Icon: Calendar },
  { name: 'Filmes', href: '/filmes', Icon: Film },
  { name: 'Catálogo', href: '/lista', Icon: ListFilter },
  { name: 'Favoritos', href: '/favoritos', Icon: Heart },
];

export function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { favorites, newEpisodesCount } = useFavorites();
  const isActive = (href: string) => pathname === href;
  const secondary = links.filter((link) => ['/populares', '/calendario', '/filmes'].includes(link.href));
  const core = [links[0], { name: 'Buscar', href: '/pesquisa', Icon: Search }, links[4], links[5]];

  return <>
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color:rgba(9,10,14,.9)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-18 md:px-8">
        <Link href="/" prefetch={false} aria-label="AniStream — início" className="flex min-w-0 shrink-0 items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--accent)]"><Play size={19} className="ml-0.5 fill-current" /></span>
          <span className="hidden font-black tracking-wider min-[350px]:block">ANI<span className="text-[var(--accent)]">STREAM</span></span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {links.map(({ name, href, Icon }) => <Link key={href} href={href} prefetch={false} aria-current={isActive(href) ? 'page' : undefined} className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-colors ${isActive(href) ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)] hover:bg-white/6 hover:text-white'}`}><Icon size={17} />{name}{href === '/favoritos' && favorites.length > 0 && <span className="rounded-full bg-black/15 px-1.5 font-mono-data text-xs">{favorites.length}</span>}</Link>)}
        </nav>
        <div className="ml-auto hidden w-full max-w-sm md:block"><SearchBar isCompact /></div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button onClick={() => { setMobileSearchOpen((value) => !value); setMoreOpen(false); }} aria-label={mobileSearchOpen ? 'Fechar busca' : 'Abrir busca'} aria-expanded={mobileSearchOpen} className="grid size-11 place-items-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-white/7 hover:text-white md:hidden">{mobileSearchOpen ? <X size={20} /> : <Search size={20} />}</button>
          <button onClick={() => { setMoreOpen((value) => !value); setMobileSearchOpen(false); }} aria-label={moreOpen ? 'Fechar menu Mais' : 'Abrir menu Mais'} aria-expanded={moreOpen} aria-controls="mobile-more-menu" className="grid size-11 place-items-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-white/7 hover:text-white lg:hidden">{moreOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobileSearchOpen && <div className="border-t border-[var(--border-subtle)] p-3 md:hidden"><SearchBar placeholder="Buscar animes..." onNavigate={() => setMobileSearchOpen(false)} /></div>}
      {moreOpen && <nav id="mobile-more-menu" aria-label="Mais destinos" className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)] p-3 lg:hidden"><div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 sm:grid-cols-3">{secondary.map(({ name, href, Icon }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold ${isActive(href) ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-secondary)] hover:bg-white/7 hover:text-white'}`}><Icon size={19} />{name}</Link>)}</div></nav>}
    </header>
    <nav aria-label="Navegação móvel" className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[var(--border-subtle)] bg-[color:rgba(9,10,14,.94)] px-2 pt-1 backdrop-blur-xl lg:hidden">
      {core.map(({ name, href, Icon }) => { const active = isActive(href) || (href === '/pesquisa' && mobileSearchOpen); return <Link key={href} href={href} prefetch={false} aria-current={active ? 'page' : undefined} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-xs font-medium ${active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}><span className="relative"><Icon size={20} />{href === '/favoritos' && newEpisodesCount > 0 && <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-[var(--success)] px-1 text-center font-mono-data text-[10px] text-black">{newEpisodesCount}</span>}</span><span className="max-w-full truncate">{name}</span></Link>; })}
    </nav>
  </>;
}
