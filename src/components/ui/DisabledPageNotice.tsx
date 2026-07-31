'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

interface DisabledPageNoticeProps {
  title?: string;
  message?: string;
  pageName?: string;
}

export function DisabledPageNotice({
  title = 'Página Temporariamente Indisponível',
  message = 'Esta seção foi desativada temporariamente pelo administrador para atualização de catálogo ou manutenção.',
  pageName,
}: DisabledPageNoticeProps) {
  return (
    <div className="min-h-[60vh] max-w-3xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-6 my-12">
      <div className="p-5 rounded-3xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] shadow-2xl shadow-[#FF6B00]/20 animate-pulse">
        <ShieldAlert size={48} />
      </div>

      <div className="space-y-2">
        {pageName && (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-white/10 text-gray-300 uppercase tracking-widest border border-white/10">
            {pageName}
          </span>
        )}
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
          {title}
        </h1>
        <p className="text-sm md:text-base text-gray-300 max-w-xl mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/"
          className="px-6 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-sm flex items-center gap-2 transition-all shadow-xl shadow-[#FF6B00]/30 hover:scale-105"
        >
          <Home size={18} />
          <span>Voltar à Página Inicial</span>
        </Link>
      </div>
    </div>
  );
}
