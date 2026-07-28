import React from 'react';
import Link from 'next/link';
import { Film, RefreshCw, Compass } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
  actionHref?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'Nenhum anime encontrado',
  description = 'Não encontramos resultados para sua busca ou filtros selecionados.',
  icon,
  onRetry,
  retryText = 'Tentar novamente',
  actionHref,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center glass-panel rounded-3xl my-8 max-w-lg mx-auto border border-white/10 bg-white/[0.02]">
      <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mb-4 border border-[#FF6B00]/20 shadow-lg shadow-[#FF6B00]/10">
        {icon || <Film size={32} />}
      </div>
      <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed max-w-sm">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all"
          >
            <RefreshCw size={16} />
            {retryText}
          </button>
        )}

        {actionHref && actionText && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#FF6B00]/30"
          >
            <Compass size={16} />
            {actionText}
          </Link>
        )}

        {onAction && actionText && !actionHref && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#FF6B00]/30"
          >
            <Compass size={16} />
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
