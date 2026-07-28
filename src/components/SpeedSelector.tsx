'use client';

import React, { useState } from 'react';
import { Gauge, Check } from 'lucide-react';

export interface SpeedSelectorProps {
  currentSpeed: number;
  onChange: (speed: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function SpeedSelector({ currentSpeed, onChange }: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/10"
        title="Velocidade de Reprodução"
      >
        <Gauge size={14} className="text-[#FF6B00]" />
        <span>{currentSpeed === 1 ? '1.0x' : `${currentSpeed}x`}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-10 right-0 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl space-y-1 z-50 min-w-[130px]">
          <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider border-b border-white/10">
            Velocidade
          </p>

          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => {
                onChange(speed);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentSpeed === speed
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{speed === 1 ? '1.0x (Normal)' : `${speed}x`}</span>
              {currentSpeed === speed && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
