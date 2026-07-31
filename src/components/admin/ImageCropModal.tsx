'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Crop, Move, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface ImageCropModalProps {
  imageUrl: string;
  aspectRatio: 'poster' | 'banner'; // 'poster' = 3:4, 'banner' = 16:9
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedUrl: string) => void;
}

export function ImageCropModal({ imageUrl, aspectRatio, isOpen, onClose, onSave }: ImageCropModalProps) {
  const { panelRef, titleId } = useDialogAccessibility(isOpen, onClose);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const isPoster = aspectRatio === 'poster';

  const handleSave = () => {
    // Retorna a URL ajustada (ou simulada ajustada)
    onSave(imageUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-xl p-6 rounded-3xl bg-[#12121A] border border-white/10 space-y-4 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-[#FF6B00] font-bold text-sm">
            <Crop size={18} />
            <span id={titleId}>Ajustar Recorte ({isPoster ? 'Pôster 3:4' : 'Banner 16:9'})</span>
          </div>
          <button onClick={onClose} aria-label="Fechar ajuste de imagem" className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Canvas de Edição / Visualização do Recorte */}
        <div className="relative w-full h-64 bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
          <div
            className={`relative border-2 border-[#FF6B00] overflow-hidden flex items-center justify-center ${
              isPoster ? 'w-40 h-56' : 'w-full h-44 mx-4'
            }`}
          >
            <Image
              src={imageUrl || 'https://picsum.photos/600/400'}
              alt="Preview"
              width={600}
              height={400}
              unoptimized
              className="max-w-none transition-transform duration-75 object-cover cursor-move"
              style={{
                transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
              }}
            />
            <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
              <Move size={20} className="text-white/60 drop-shadow-md" />
            </div>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <ZoomOut size={16} className="text-gray-400" />
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-36 accent-[#FF6B00]"
            />
            <ZoomIn size={16} className="text-gray-400" />
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="text-[11px] text-gray-400 hover:text-white underline"
          >
            Resetar Posição
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Salvar Recorte</span>
          </button>
        </div>
      </div>
    </div>
  );
}
