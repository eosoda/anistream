'use client';

import React from 'react';
import { X, Film } from 'lucide-react';

export interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeId?: string;
  title?: string;
}

export function TrailerModal({
  isOpen,
  onClose,
  youtubeId = 'dQw4w9WgXcQ',
  title = 'Trailer Oficial',
}: TrailerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-neutral-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film size={20} className="text-[#FF6B00]" />
            <h3 className="text-base font-bold text-white line-clamp-1">
              Trailer Oficial: {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Embed */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
