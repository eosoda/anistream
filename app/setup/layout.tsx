import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, ShieldCheck, Wrench, Database, Sparkles, Server } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Configuração Inicial | AniStream Wizard',
  description: 'Assistente de instalação e configuração inicial do banco de dados, administrador e fontes do AniStream.',
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col relative overflow-hidden selection:bg-[#FF6B00] selection:text-white">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#FF6B00]/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Setup Top Header */}
      <header className="w-full border-b border-white/10 bg-[#0B0B0F]/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8800] flex items-center justify-center shadow-lg shadow-[#FF6B00]/25">
              <Flame size={20} className="text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">
                  Ani<span className="text-[#FF6B00]">Stream</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] text-[10px] font-bold tracking-wide uppercase flex items-center gap-1">
                  <Wrench size={10} />
                  Setup Wizard
                </span>
              </div>
            </div>
          </div>

          {/* Right Status Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300">
              <Server size={14} className="text-[#FF6B00]" />
              <span>Next.js 15 App Router</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
              <ShieldCheck size={14} />
              <span>Modo Instalação</span>
            </div>
          </div>
        </div>
      </header>

      {/* Setup Main Body Content */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10 flex flex-col justify-center">
        {children}
      </main>

      {/* Setup Dedicated Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0B0B0F]/90 backdrop-blur-md py-4 relative z-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 font-medium">
            <Database size={14} className="text-[#FF6B00]" />
            <span>AniStream System Setup & Initialization</span>
          </div>
          <p className="text-[11px] text-gray-400">
            © {new Date().getFullYear()} AniStream • Banco de Dados, Administrador & Kenjitsu
          </p>
        </div>
      </footer>
    </div>
  );
}
