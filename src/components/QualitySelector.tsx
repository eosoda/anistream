'use client';

import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';

export interface QualityOption {
  id: number;
  height: number;
  bitrate: number;
  label: string;
}

export interface QualitySelectorProps {
  qualities: QualityOption[];
  currentQuality: number;
  onChange: (qualityId: number) => void;
}

export function QualitySelector({
  qualities,
  currentQuality,
  onChange,
}: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
      >
        <Settings size={14} />
        <span>
          {currentQuality === -1
            ? 'Qualidade: Auto'
            : qualities.find((q) => q.id === currentQuality)?.label || 'Qualidade'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-1 z-50 min-w-[140px]">
          <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-white/10">
            Qualidade do Vídeo
          </p>

          <button
            onClick={() => {
              onChange(-1);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentQuality === -1
                ? 'bg-[#FF6B00] text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <span>Automático</span>
            {currentQuality === -1 && <Check size={14} />}
          </button>

          {qualities.map((q) => (
            <button
              key={q.id}
              onClick={() => {
                onChange(q.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentQuality === q.id
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{q.label}</span>
              {currentQuality === q.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
