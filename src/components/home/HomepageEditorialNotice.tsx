'use client';

import Link from 'next/link';
import { ArrowRight, Info, ShieldAlert, Sparkles } from 'lucide-react';
import type { HomepageEditorialNoticeBlock } from '@/types/homepage';

const variantClasses = {
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
} as const;

export function HomepageEditorialNotice({ block }: { block: HomepageEditorialNoticeBlock }) {
  if (!block.active) return null;
  const Icon = block.variant === 'warning' ? ShieldAlert : block.variant === 'success' ? Sparkles : Info;

  return (
    <aside className={`flex flex-col gap-4 rounded-[var(--radius-panel)] border p-5 sm:flex-row sm:items-center sm:justify-between ${variantClasses[block.variant]}`} aria-label={block.title}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-black">{block.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed opacity-85">{block.body}</p>
        </div>
      </div>
      {block.cta && (
        <Link
          href={block.cta.href}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-current/30 px-3 text-xs font-bold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          {block.cta.label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}
