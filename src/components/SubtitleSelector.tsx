'use client';

import React, { useState } from 'react';
import { Captions, Check } from 'lucide-react';
import { SubtitleTrack } from './VideoPlayer';

export interface SubtitleSelectorProps {
  subtitles: SubtitleTrack[];
  activeSubtitle: string;
  onChange: (language: string) => void;
}

export function SubtitleSelector({
  subtitles,
  activeSubtitle,
  onChange,
}: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
      >
        <Captions size={14} className="text-[#FF6B00]" />
        <span>
          {activeSubtitle === 'off'
            ? 'Legenda: Desativada'
            : subtitles.find((s) => s.language === activeSubtitle)?.label || 'Legenda'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-1 z-50 min-w-[150px]">
          <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-white/10">
            Legendas Disponíveis
          </p>

          <button
            onClick={() => {
              onChange('off');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubtitle === 'off'
                ? 'bg-[#FF6B00] text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <span>Desativada</span>
            {activeSubtitle === 'off' && <Check size={14} />}
          </button>

          {subtitles.map((sub, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(sub.language);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubtitle === sub.language
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{sub.label}</span>
              {activeSubtitle === sub.language && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
