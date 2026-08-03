'use client';

import React, { useEffect, useState } from 'react';
import { Bot, Check, CheckCircle2, Loader2, Play, RefreshCw, X, Zap } from 'lucide-react';

interface QueueItem {
  id: string;
  animeTitle: string;
  detectedEpisode: number;
  providerId: string;
  createdAt: string;
}

export function AutopilotPanel() {
  const [autoIndexerEnabled, setAutoIndexerEnabled] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/autopilot');
      const data = await res.json();
      setAutoIndexerEnabled(data.autoIndexerEnabled);
      setQueue(data.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStatus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleToggleAutoMode = async (enabled: boolean) => {
    setAutoIndexerEnabled(enabled);
    try {
      const res = await fetch('/api/admin/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', enabled }),
      });
      const data = await res.json();
      setActionMsg(data.message);
    } catch (err: any) {
      setActionMsg(`Erro: ${err.message}`);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/admin/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      const data = await res.json();
      setActionMsg(data.message);
      fetchStatus();
    } catch (err: any) {
      setActionMsg(`Erro: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleReviewItem = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/autopilot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      setActionMsg(data.message);
      fetchStatus();
    } catch (err: any) {
      setActionMsg(`Erro: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Loader2 size={24} className="text-[#FF6B00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-6">
      {/* Header com Toggle do Robô */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400">
            <Bot size={28} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Robô de Auto-Indexação (Autopilot)</span>
              {autoIndexerEnabled ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Automático (ON)
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Modo Manual / Fila (OFF)
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400">
              Consulta extensoes Kenjitsu habilitadas e cria as paginas de animes/episodios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Varredura Manual */}
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-lg shadow-[#FF6B00]/20"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            <span>Consultar extensões</span>
          </button>

          {/* Toggle Chave Robô */}
          <button
            onClick={() => handleToggleAutoMode(!autoIndexerEnabled)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border ${
              autoIndexerEnabled
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30'
                : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
            }`}
          >
            {autoIndexerEnabled ? 'Robô Automático ATIVO' : 'Ativar Modo Automático'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <p className="text-xs font-bold text-sky-400 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
          {actionMsg}
        </p>
      )}

      {/* Fila de Revisão Manual (Exibida quando auto-indexer desativado ou itens pendentes) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
          <span>Fila de Animes Encontrados para Revisão ({queue.length})</span>
          <button onClick={fetchStatus} className="text-gray-400 hover:text-white flex items-center gap-1">
            <RefreshCw size={12} />
            <span>Atualizar</span>
          </button>
        </h3>

        {queue.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-500">
            Nenhum anime pendente na fila de revisão. Clique em &quot;Consultar extensões&quot; para buscar novas mídias.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between text-xs gap-3"
              >
                <div>
                  <span className="font-bold text-white text-sm">{item.animeTitle}</span>
                  <p className="text-[11px] text-gray-400">
                    Episódio Detectado: #{item.detectedEpisode} | Encontrado em:{' '}
                    {new Date(item.createdAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewItem(item.id, 'REJECTED')}
                    className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold flex items-center gap-1"
                    title="Rejeitar Candidato"
                  >
                    <X size={14} />
                    <span className="hidden sm:inline">Rejeitar</span>
                  </button>

                  <button
                    onClick={() => handleReviewItem(item.id, 'APPROVED')}
                    className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/20"
                    title="Aprovar e buscar dados pelo Kenjitsu"
                  >
                    <Check size={14} />
                    <span>Aprovar & Criar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
