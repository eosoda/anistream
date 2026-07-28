'use client';

import React, { useState } from 'react';
import { Volume2, Check } from 'lucide-react';

export interface AudioTrackOption {
  id: number;
  name: string;
  lang: string;
}

export interface AudioSelectorProps {
  audioTracks: AudioTrackOption[];
  currentAudio: number;
  onChange: (trackId: number) => void;
}

export function AudioSelector({
  audioTracks,
  currentAudio,
  onChange,
}: AudioSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
      >
        <Volume2 size={14} className="text-[#FF6B00]" />
        <span>
          {audioTracks.find((a) => a.id === currentAudio)?.name || 'Áudio'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-1 z-50 min-w-[150px]">
          <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-white/10">
            Idioma do Áudio
          </p>

          {audioTracks.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onChange(a.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentAudio === a.id
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{a.name}</span>
              {currentAudio === a.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
