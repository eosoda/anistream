'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 glass-panel">
      <Tooltip content="Visualização em Grade de Capas" position="top">
        <button
          onClick={() => onChange('grid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            mode === 'grid'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={15} />
          <span className="hidden sm:inline">Grade</span>
        </button>
      </Tooltip>

      <Tooltip content="Visualização em Lista Compacta (Linhas Finas)" position="top">
        <button
          onClick={() => onChange('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            mode === 'list'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <List size={15} />
          <span className="hidden sm:inline">Lista</span>
        </button>
      </Tooltip>
    </div>
  );
}
