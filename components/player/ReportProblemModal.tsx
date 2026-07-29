'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send, X } from 'lucide-react';

interface ReportProblemModalProps {
  episodeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportProblemModal({ episodeId, isOpen, onClose }: ReportProblemModalProps) {
  const [type, setType] = useState('BROKEN_LINK');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          type,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar relato');

      setSuccessMsg(data.message || 'Relato enviado aos administradores!');
      setTimeout(() => {
        setSuccessMsg(null);
        setDescription('');
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#12121A] border border-white/10 space-y-4 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle size={18} />
            <span>Reportar Problema neste Vídeo</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-white">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Qual o tipo de problema?</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
              >
                <option value="BROKEN_LINK">Link Quebrado / Vídeo não carrega</option>
                <option value="NO_AUDIO">Sem Áudio / Áudio Mudo</option>
                <option value="DESYNC_SUBTITLE">Legenda Desincronizada ou Faltando</option>
                <option value="OTHER">Outro Problema</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Detalhes (Opcional)</label>
              <textarea
                rows={3}
                placeholder="Ex: O áudio trava no minuto 04:30..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
              />
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
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar Relato</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
