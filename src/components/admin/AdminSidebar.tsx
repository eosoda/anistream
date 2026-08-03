'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  ExternalLink,
  Film,
  Flame,
  LayoutDashboard,
  Navigation,
  PlugZap,
  Puzzle,
  RadioTower,
  Rocket,
  Settings,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface AdminNavItem {
  name: string;
  href: string;
  exact: boolean;
  icon: typeof LayoutDashboard;
}

const navGroups: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'Monitorar',
    items: [
      { name: 'Visão geral', href: '/admin', exact: true, icon: LayoutDashboard },
      { name: 'Extensões Kenjitsu', href: '/admin/extensions', exact: true, icon: Puzzle },
    ],
  },
  {
    label: 'Gerenciar',
    items: [
      { name: 'Animes e episódios', href: '/admin/animes', exact: false, icon: Film },
      { name: 'Navegação', href: '/admin/navigation', exact: true, icon: Navigation },
    ],
  },
  {
    label: 'Operar',
    items: [
      { name: 'Sistema', href: '/admin/system', exact: true, icon: Settings },
      { name: 'Backups', href: '/admin/backups', exact: true, icon: DatabaseBackup },
      { name: 'Integrações', href: '/admin/integrations', exact: true, icon: PlugZap },
      { name: 'Comunicados', href: '/admin/broadcasts', exact: true, icon: RadioTower },
      { name: 'Releases', href: '/admin/releases', exact: true, icon: Rocket },
    ],
  },
];

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (item: AdminNavItem) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        aria-label="Navegação administrativa"
        className={cn(
          'admin-sidebar fixed inset-y-0 left-0 z-50 flex h-screen flex-col transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:translate-x-0',
          collapsed && 'is-collapsed',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="admin-sidebar-brand flex min-h-16 items-center justify-between gap-3 px-3.5">
          <Link href="/admin" onClick={onCloseMobile} className="flex min-w-0 items-center gap-3" aria-label="Ir para a visão geral">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--accent)] text-[#1a0d05]">
              <Flame size={19} fill="currentColor" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <strong className="block truncate text-sm font-extrabold tracking-tight text-white">Ani<span className="text-[var(--accent)]">Stream</span></strong>
                <span className="mt-0.5 flex items-center gap-1 text-[.63rem] font-bold uppercase tracking-[.14em] text-[var(--admin-dim)]"><Wrench size={10} aria-hidden="true" /> Admin</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="admin-icon-button hidden lg:inline-grid"
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Áreas do painel">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && <p className="admin-sidebar-group-label">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.name : undefined}
                      className={cn('admin-sidebar-link', active && 'is-active', collapsed && 'justify-center px-0')}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer p-3">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className={cn('admin-sidebar-link', collapsed && 'justify-center px-0')}
            title={collapsed ? 'Abrir site público' : undefined}
          >
            <ExternalLink size={16} aria-hidden="true" />
            {!collapsed && <span>Ver site público</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
