'use client';

import React from 'react';
import { X, Trophy, Clock, Tv, Flame, Sparkles } from 'lucide-react';

export interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserStatsModal({ isOpen, onClose }: UserStatsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-neutral-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={22} className="text-[#FF6B00]" />
            <h3 className="text-base font-bold text-white">Suas Estatísticas de Maratonas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase">Tempo Assistido</span>
              <Clock size={16} className="text-[#FF6B00]" />
            </div>
            <p className="text-2xl font-black text-white">48h 20m</p>
            <p className="text-[10px] text-emerald-400 font-bold">+12% este mês</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[11px] font-bold uppercase">Episódios</span>
              <Tv size={16} className="text-[#FF6B00]" />
            </div>
            <p className="text-2xl font-black text-white">121 eps</p>
            <p className="text-[10px] text-gray-400">Assistidos no total</p>
          </div>
        </div>

        {/* Sequência / Streak */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF6B00]/20 to-amber-500/20 border border-[#FF6B00]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FF6B00] text-white">
              <Flame size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Sequência Diária (Streak)</h4>
              <p className="text-[11px] text-gray-300">Você assistiu animes por 5 dias seguidos!</p>
            </div>
          </div>
          <span className="text-lg font-black text-[#FF6B00]">🔥 5 Dias</span>
        </div>

        {/* Gêneros Favoritos */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF6B00]" />
            <span>Gêneros Mais Assistidos</span>
          </h4>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-bold">Ação & Shounen</span>
              <span className="text-xs text-gray-400 font-mono">65%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6B00] rounded-full" style={{ width: '65%' }} />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-300 font-bold">Fantasia & Isekai</span>
              <span className="text-xs text-gray-400 font-mono">25%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '25%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
