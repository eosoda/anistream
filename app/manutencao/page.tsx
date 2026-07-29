'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ShieldAlert, Sparkles, Wrench } from 'lucide-react';

export default function MaintenancePage() {
  const [data, setData] = useState<{
    message: string;
    estimatedEnd?: string;
  }>({
    message: 'Estamos em manutenção para atualização de servidores.',
  });

  useEffect(() => {
    fetch('/api/maintenance')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.message) {
          setData(resData);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg space-y-6 p-8 rounded-3xl bg-white/5 border border-white/10 glass-panel shadow-2xl animate-fade-in">
        <div className="relative inline-block">
          <div className="p-5 rounded-3xl bg-[#FF6B00]/20 text-[#FF6B00] inline-block animate-pulse">
            <Wrench size={48} />
          </div>
          <Sparkles size={20} className="absolute -top-1 -right-1 text-amber-400 animate-spin" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30">
            Modo Manutenção Ativo
          </span>
          <h1 className="text-3xl font-black text-white">Voltamos em Instantes!</h1>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed max-w-md mx-auto">
          {data.message}
        </p>

        {data.estimatedEnd && (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 inline-flex items-center gap-2 text-xs font-bold text-amber-400">
            <Clock size={16} />
            <span>Previsão de término: {new Date(data.estimatedEnd).toLocaleString('pt-BR')}</span>
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <Link
            href="/admin/login"
            className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <ShieldAlert size={14} />
            <span>Acesso Administrativo</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
