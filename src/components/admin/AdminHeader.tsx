'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, ShieldCheck, Database, User, Loader2 } from 'lucide-react';

interface AdminHeaderProps {
  onOpenMobileSidebar: () => void;
}

export function AdminHeader({ onOpenMobileSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    router.replace('/admin/login');
  };

  return (
    <header className="w-full h-16 bg-[#0D0E15]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Mobile Menu Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10"
          aria-label="Abrir Menu Lateral"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-gray-300 hidden sm:inline">
            Sistema Operacional • Conectado
          </span>
        </div>
      </div>

      {/* Right User Status & Actions */}
      <div className="flex items-center gap-3">
        {/* User Info Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-xl bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00]">
            <User size={14} />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-white leading-tight">Administrador</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Sessão Ativa</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-50"
          title="Encerrar sessão administrativa"
        >
          {loggingOut ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
