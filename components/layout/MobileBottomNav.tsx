'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Flame, Calendar, Film, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites, newEpisodesCount } = useFavorites();

  const navItems = [
    { name: 'Início', href: '/', icon: <Home size={20} /> },
    { name: 'Populares', href: '/populares', icon: <Flame size={20} /> },
    { name: 'Temporadas', href: '/temporadas', icon: <Calendar size={20} /> },
    { name: 'Filmes', href: '/filmes', icon: <Film size={20} /> },
    {
      name: 'Favoritos',
      href: '/favoritos',
      icon: <Heart size={20} />,
      badge: favorites.length > 0 ? favorites.length : undefined,
      newBadge: newEpisodesCount > 0 ? newEpisodesCount : undefined,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 shadow-2xl animate-fade-in">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-[#FF6B00] font-black scale-105'
                  : 'text-gray-400 hover:text-gray-200 font-semibold'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.newBadge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
                    {item.newBadge}
                  </span>
                ) : item.badge ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6B00] text-white text-[9px] font-black flex items-center justify-center shadow-md">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>

              {isActive && (
                <div className="w-4 h-1 rounded-full bg-[#FF6B00] absolute bottom-0 shadow-sm shadow-[#FF6B00]/50" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
