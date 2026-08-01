'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 flex items-center justify-center text-3xl font-black shadow-2xl">
        404
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          O anime ou página que você procurou não existe ou foi movido para outro endereço.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#FF6B00]/30 transition-all"
        >
          <Home size={16} />
          <span>Voltar para Início</span>
        </Link>

        <Link
          href="/pesquisa"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 font-bold text-xs sm:text-sm transition-all"
        >
          <Search size={16} />
          <span>Buscar Animes</span>
        </Link>
      </div>
    </div>
  );
}
