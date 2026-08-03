'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, Command, LogOut, Menu, ShieldCheck, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const labels: Record<string, string> = {
  admin: 'Painel',
  animes: 'Catálogo',
  novo: 'Novo anime',
  editar: 'Editar',
  extensions: 'Extensões Kenjitsu',
  homepage: 'Construtor da Home',
  navigation: 'Navegação',
  system: 'Sistema',
  backups: 'Backups',
  integrations: 'Integrações',
  broadcasts: 'Comunicados',
  releases: 'Releases',
};

export function AdminHeader({
  onOpenMobileSidebar,
  onOpenCommandPalette,
}: {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const segments = pathname.split('/').filter(Boolean).slice(1);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
    }
  };

  return (
    <header className="admin-header sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="admin-header-button lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu size={19} />
        </button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-xs text-[var(--admin-dim)] sm:flex">
          <span className="inline-flex items-center gap-1 text-[var(--admin-muted)]"><ShieldCheck size={14} className="text-[var(--success)]" /> Operação</span>
          {segments.map((segment, index) => (
            <span key={`${segment}-${index}`} className={cn('inline-flex min-w-0 items-center gap-1', index === segments.length - 1 && 'text-[var(--admin-text)]')}>
              <ChevronRight size={13} aria-hidden="true" />
              <span className="truncate">{labels[segment] || segment}</span>
            </span>
          ))}
        </nav>
        <span className="flex items-center gap-2 text-xs font-semibold text-[var(--admin-muted)] sm:hidden">
          <span className="size-2 rounded-full bg-[var(--success)]" aria-hidden="true" /> Painel AniStream
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={onOpenCommandPalette} className="admin-header-button" aria-label="Abrir navegação rápida">
          <Command size={16} />
          <span className="hidden md:inline">Ir para</span>
          <kbd className="hidden rounded border border-[var(--admin-line-strong)] px-1.5 py-0.5 text-[10px] text-[var(--admin-dim)] lg:inline">Ctrl K</kbd>
        </button>
        <div className="hidden items-center gap-2 border-l border-[var(--admin-line)] pl-2 sm:flex">
          <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--admin-panel-raised)] text-[var(--accent)]"><User size={15} /></span>
          <span className="hidden text-left lg:block"><strong className="block text-xs text-[var(--admin-text)]">Administrador</strong><small className="block text-[.68rem] text-[var(--success)]">Sessão ativa</small></span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="admin-header-button text-[var(--danger)] hover:text-[#ff9ba5]"
          aria-label="Encerrar sessão administrativa"
        >
          {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
