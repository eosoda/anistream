'use client';

import React from 'react';

export interface CinemaOverlayProps {
  active: boolean;
  onClose: () => void;
}

export function CinemaOverlay({ active, onClose }: CinemaOverlayProps) {
  if (!active) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/95 z-40 transition-opacity duration-500 pointer-events-auto flex items-center justify-center cursor-pointer"
    >
      <div className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/10 backdrop-blur-md">
        Modo Cinema Ativo (Clique em qualquer lugar para sair)
      </div>
    </div>
  );
}
