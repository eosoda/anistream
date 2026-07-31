'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, Flame, Calendar, Film, ListFilter, Heart, Menu, X, Search, Trophy } from 'lucide-react';
import { SearchBar } from '@/components/catalog/SearchBar';
import { useFavorites } from '@/hooks/useFavorites';
import { UserStatsModal } from '@/components/user/UserStatsModal';

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const { favorites, newEpisodesCount } = useFavorites();

  const navLinks = [
    { name: 'Home', href: '/', icon: <Play size={18} /> },
    { name: 'Populares', href: '/populares', icon: <Flame size={18} /> },
    { name: 'Calendário', href: '/calendario', icon: <Calendar size={18} /> },
    { name: 'Filmes', href: '/filmes', icon: <Film size={18} /> },
    { name: 'Catálogo', href: '/lista', icon: <ListFilter size={18} /> },
    {
      name: 'Favoritos',
      href: '/favoritos',
      icon: <Heart size={18} />,
      badge: favorites.length > 0 ? favorites.length : undefined,
      newBadgeCount: newEpisodesCount > 0 ? newEpisodesCount : 0,
    },
  ];

  return (
    <>
      <UserStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      <header className="sticky top-0 z-50 w-full bg-[#0B0B0F]/85 backdrop-blur-xl border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" prefetch={false} className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8533] flex items-center justify-center text-white shadow-lg shadow-[#FF6B00]/30 group-hover:scale-105 transition-transform">
              <Play size={18} className="fill-current ml-0.5 md:w-5 md:h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg md:text-2xl tracking-wider text-white">
                ANI<span className="text-[#FF6B00]">STREAM</span>
              </span>
              <span className="text-[8px] md:text-[9px] text-gray-400 font-semibold tracking-widest -mt-1 uppercase">
                Catálogo V1
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-nowrap shrink-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const hasNew = link.newBadgeCount ? link.newBadgeCount > 0 : false;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={false}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-full font-bold text-xs xl:text-sm transition-all relative whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="relative flex-shrink-0">
                    {link.icon}
                    {hasNew && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B0B0F] animate-ping" />
                    )}
                  </span>
                  <span className="whitespace-nowrap">{link.name}</span>
                  {hasNew ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-white animate-pulse border border-emerald-300/30 shadow-sm flex items-center gap-0.5 whitespace-nowrap">
                      +{link.newBadgeCount} NOVO
                    </span>
                  ) : (
                    link.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-[#FF6B00] whitespace-nowrap">
                        {link.badge}
                      </span>
                    )
                  )}
                </Link>
              );
            })}

            {/* Botão de Estatísticas Pessoais */}
            <button
              onClick={() => setIsStatsOpen(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10"
              title="Ver Estatísticas de Maratonas"
            >
              <Trophy size={18} className="text-[#FF6B00]" />
            </button>
          </nav>

          {/* Desktop Search */}
          <div className="hidden md:block flex-grow max-w-sm ml-auto">
            <SearchBar isCompact />
          </div>

          {/* Mobile Search Toggle & Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="p-2.5 rounded-full bg-white/5 text-gray-300 border border-white/10"
              title="Estatísticas"
            >
              <Trophy size={18} className="text-[#FF6B00]" />
            </button>
            <button
              onClick={() => {
                setIsMobileSearchOpen(!isMobileSearchOpen);
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-full border transition-all ${
                isMobileSearchOpen
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                  : 'bg-white/5 text-gray-300 hover:text-white border-white/10'
              }`}
              aria-label="Abrir Pesquisa"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                if (isMobileSearchOpen) setIsMobileSearchOpen(false);
              }}
              className={`p-2.5 rounded-full border transition-all ${
                isMobileMenuOpen
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                  : 'bg-white/5 text-gray-300 hover:text-white border-white/10'
              }`}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {isMobileSearchOpen && (
          <div className="md:hidden px-4 py-3 border-t border-white/10 bg-[#0B0B0F]/95 animate-fade-in">
            <SearchBar placeholder="Buscar animes..." onNavigate={() => setIsMobileSearchOpen(false)} />
          </div>
        )}

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-4 py-5 border-t border-white/10 bg-[#0B0B0F]/95 space-y-1.5 animate-fade-in shadow-2xl">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const hasNew = link.newBadgeCount ? link.newBadgeCount > 0 : false;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    <span>{link.name}</span>
                  </div>
                  {hasNew ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white animate-pulse">
                      +{link.newBadgeCount} NOVO
                    </span>
                  ) : (
                    link.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-[#FF6B00]">
                        {link.badge}
                      </span>
                    )
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0B0F]/90 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-bottom">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const hasNew = link.newBadgeCount ? link.newBadgeCount > 0 : false;
          return (
            <Link
              key={`bottom-${link.name}`}
              href={link.href}
              prefetch={false}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-[#FF6B00] font-bold' : 'text-gray-400 hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                {link.icon}
                {hasNew ? (
                  <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white border border-black shadow-sm animate-pulse">
                    +{link.newBadgeCount}
                  </span>
                ) : (
                  link.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#FF6B00] text-white border border-black shadow-sm">
                      {link.badge}
                    </span>
                  )
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap">{link.name}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-0.5 bg-[#FF6B00] rounded-full shadow-sm shadow-[#FF6B00]" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
