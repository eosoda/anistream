import Link from 'next/link';
import { ArrowRight, CircleAlert, CircleCheck, type LucideIcon } from 'lucide-react';
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin';

export interface OperationalItem {
  title: string;
  description: string;
  href?: string;
  status?: 'ok' | 'attention' | 'unknown';
}

export function OperationalPage({ title, description, icon: Icon, items }: { title: string; description: string; icon: LucideIcon; items: OperationalItem[] }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Livro de operações" title={title} description={description} />
      <AdminPanel>
        <div className="admin-panel-header">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center border border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF8A3D]"><Icon size={20} aria-hidden="true" /></span>
            <div>
              <p className="admin-eyebrow">Estado da superfície</p>
              <h2 className="admin-section-title">Controles e pontos de atenção</h2>
            </div>
          </div>
          <span className="font-mono text-[11px] text-[var(--admin-dim)]">LOCAL / ADMIN</span>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {items.map((item) => {
            const state = item.status === 'attention' ? 'degraded' : item.status === 'unknown' ? 'unknown' : 'healthy';
            const content = (
              <>
                <span className="grid size-9 shrink-0 place-items-center border border-[var(--admin-line)] bg-[var(--admin-page)]" aria-hidden="true">
                  {item.status === 'attention' ? <CircleAlert size={17} className="text-amber-300" /> : <CircleCheck size={17} className="text-emerald-300" />}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-[var(--admin-text)]">{item.title}</strong>
                  <span className="mt-1 block text-sm text-[var(--admin-muted)]">{item.description}</span>
                </span>
                <AdminStatusBadge status={state} label={item.status === 'attention' ? 'Atenção' : item.status === 'unknown' ? 'Sem diagnóstico' : 'Operacional'} />
                {item.href && <ArrowRight size={17} className="shrink-0 text-[var(--admin-dim)]" aria-hidden="true" />}
              </>
            );
            return item.href ? <Link key={`${item.title}-${item.href}`} href={item.href} className="flex min-h-20 items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.035]">{content}</Link> : <div key={item.title} className="flex min-h-20 items-center gap-3 px-4 py-3">{content}</div>;
          })}
        </div>
      </AdminPanel>
    </div>
  );
}
