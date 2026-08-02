'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Radio,
  TestTube2,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Flame,
  Wrench,
  ExternalLink,
  Settings,
  RadioTower,
  DatabaseBackup,
  PlugZap,
  Rocket,
  Puzzle,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      exact: true,
      icon: <LayoutDashboard size={18} />,
      badge: 'Geral',
    },
    {
      name: 'Animes & Episódios',
      href: '/admin/animes',
      exact: false,
      icon: <Film size={18} />,
    },
    {
      name: 'Fontes & Servidores',
      href: '/admin/sources',
      exact: true,
      icon: <Radio size={18} />,
    },
    {
      name: 'Extensões Kenjitsu',
      href: '/admin/extensions',
      exact: true,
      icon: <Puzzle size={18} />,
    },
    {
      name: 'Testador de Mídia',
      href: '/admin/sources/tester',
      exact: false,
      icon: <TestTube2 size={18} />,
    },
    {
      name: 'Navegação & Links',
      href: '/admin/navigation',
      exact: false,
      icon: <Navigation size={18} />,
    },
    { name: 'Sistema', href: '/admin/system', exact: true, icon: <Settings size={18} /> },
    { name: 'Comunicados', href: '/admin/broadcasts', exact: true, icon: <RadioTower size={18} /> },
    { name: 'Backups', href: '/admin/backups', exact: true, icon: <DatabaseBackup size={18} /> },
    { name: 'Integrações', href: '/admin/integrations', exact: true, icon: <PlugZap size={18} /> },
    { name: 'Releases', href: '/admin/releases', exact: true, icon: <Rocket size={18} /> },
  ];

  const isActive = (item: { href: string; exact: boolean }) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#0D0E15] border-r border-white/10 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between h-16">
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8800] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B00]/25">
              <Flame size={20} className="text-white fill-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base tracking-tight text-white truncate">
                  Ani<span className="text-[#FF6B00]">Stream</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Wrench size={10} className="text-[#FF6B00]" />
                  Painel Admin
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
            title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {!collapsed && (
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Menu Principal
            </div>
          )}

          {navItems.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-white shadow-lg shadow-[#FF6B00]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div
                  className={`shrink-0 transition-transform group-hover:scale-110 ${
                    active ? 'text-white' : 'text-gray-400 group-hover:text-[#FF6B00]'
                  }`}
                >
                  {item.icon}
                </div>

                {!collapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                      active
                        ? 'bg-black/30 border-white/20 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Active Indicator Pill */}
                {collapsed && active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FF6B00] rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Footer Section */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {/* Quick link to public site */}
          <Link
            href="/"
            target="_blank"
            className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Abrir site público em nova aba"
          >
            <ExternalLink size={16} className="text-[#FF6B00] shrink-0" />
            {!collapsed && <span>Ver Site Público</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
