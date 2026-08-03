'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Command,
  Info,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';
import { cn } from '@/lib/utils';
import type { AdminHealthState } from '@/types/admin';

export function AdminPanel({
  as: Component = 'section',
  className,
  children,
}: {
  as?: 'section' | 'div' | 'article';
  className?: string;
  children: ReactNode;
}) {
  return <Component className={cn('admin-panel', className)}>{children}</Component>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs = [],
  actions,
  status,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div className="min-w-0">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Caminho administrativo" className="admin-breadcrumbs">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
                {item.href ? (
                  <a href={item.href} className="hover:text-white">
                    {item.label}
                  </a>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="admin-title">{title}</h1>
          {status}
        </div>
        {description && <p className="admin-description">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

const statusLabels: Record<AdminHealthState, string> = {
  healthy: 'Operacional',
  degraded: 'Degradado',
  down: 'Indisponível',
  unknown: 'Sem diagnóstico',
};

export function AdminStatusBadge({
  status,
  label,
  showDot = true,
}: {
  status: AdminHealthState;
  label?: string;
  showDot?: boolean;
}) {
  return (
    <span className={cn('admin-status-badge', `is-${status}`)}>
      {showDot && <span className="admin-status-dot" aria-hidden="true" />}
      {label || statusLabels[status]}
    </span>
  );
}

export function AdminFeedback({
  children,
  tone = 'info',
  onDismiss,
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  onDismiss?: () => void;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'danger' ? AlertCircle : tone === 'warning' ? AlertCircle : Info;
  return (
    <div className={cn('admin-feedback', `is-${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={17} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button type="button" className="admin-icon-button" onClick={onDismiss} aria-label="Fechar aviso">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-mark" aria-hidden="true">
        <Info size={20} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function AdminDataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  columns: Array<AdminTableColumn<T>>;
  rows: T[];
  empty?: ReactNode;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const selectable = Boolean(selectedIds && onToggle && onToggleAll);
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds?.has(row.id));

  if (!rows.length && empty) return <>{empty}</>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="w-12">
                <input
                  type="checkbox"
                  checked={Boolean(allSelected)}
                  onChange={(event) => onToggleAll?.(event.currentTarget.checked)}
                  aria-label="Selecionar todos os registros visíveis"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} aria-selected={selectedIds?.has(row.id) || undefined}>
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedIds?.has(row.id))}
                    onChange={() => onToggle?.(row.id)}
                    aria-label={`Selecionar ${row.id}`}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`} className={column.className}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminFilterBar({ children, label = 'Filtros' }: { children: ReactNode; label?: string }) {
  return (
    <div className="admin-filter-bar" aria-label={label}>
      {children}
    </div>
  );
}

export function AdminSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = 'Existem alterações não salvas',
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  label?: string;
}) {
  if (!dirty) return null;
  return (
    <div className="admin-save-bar" role="region" aria-label="Alterações pendentes">
      <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="admin-button is-ghost" onClick={onDiscard} disabled={saving}>
          Descartar
        </button>
        <button type="button" className="admin-button is-primary" onClick={onSave} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

export function AdminDrawer({
  open,
  title,
  description,
  onClose,
  children,
  width = 'wide',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: 'default' | 'wide';
}) {
  const { panelRef, titleId } = useDialogAccessibility(open, onClose);
  if (!open) return null;
  return (
    <div className="admin-overlay" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('admin-drawer', width === 'wide' ? 'is-wide' : 'is-default')}
      >
        <header className="admin-drawer-header">
          <div className="min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Fechar painel">
            <X size={18} />
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

interface CommandItem {
  label: string;
  description: string;
  href: string;
}

const commandItems: CommandItem[] = [
  { label: 'Visão geral', description: 'Saúde e prioridades do painel', href: '/admin' },
  { label: 'Catálogo', description: 'Animes e episódios', href: '/admin/animes' },
  { label: 'Extensões Kenjitsu', description: 'Fontes, saúde e ativação', href: '/admin/extensions' },
  { label: 'Construtor da Home', description: 'Blocos, preview e publicação', href: '/admin/homepage' },
  { label: 'Navegação', description: 'Menu e seções da Home', href: '/admin/navigation' },
  { label: 'Calendário', description: 'Release Schedule e exceções', href: '/admin/calendar' },
  { label: 'Sistema', description: 'Manutenção e disponibilidade', href: '/admin/system' },
  { label: 'Backups', description: 'Exportação e restauração', href: '/admin/backups' },
  { label: 'Integrações', description: 'Webhooks e Kenjitsu', href: '/admin/integrations' },
  { label: 'Comunicados', description: 'Mensagens para usuários', href: '/admin/broadcasts' },
  { label: 'Releases', description: 'Changelog público', href: '/admin/releases' },
];

export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const { panelRef, titleId } = useDialogAccessibility(open, onClose);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized
      ? commandItems.filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase('pt-BR').includes(normalized))
      : commandItems;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setQuery(''), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;
  return (
    <div className="admin-overlay" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="admin-command-palette">
        <div className="admin-command-search">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Ir para…"
            aria-label="Pesquisar área administrativa"
          />
          <kbd>Esc</kbd>
        </div>
        <h2 id={titleId} className="sr-only">Navegação administrativa</h2>
        <div className="admin-command-list" role="listbox" aria-label="Destinos administrativos">
          {results.length ? results.map((item) => (
            <button
              type="button"
              key={item.href}
              className={cn('admin-command-item', pathname === item.href && 'is-current')}
              onClick={() => {
                onClose();
                router.push(item.href);
              }}
            >
              <Command size={17} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left"><strong>{item.label}</strong><small>{item.description}</small></span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )) : <p className="admin-command-empty">Nenhuma área encontrada.</p>}
        </div>
      </div>
    </div>
  );
}
