'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Film,
  Tv,
  ListPlus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Server,
  Zap,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ProviderStatus } from '@/components/ProviderStatus';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (res.ok) {
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Carregando métricas de observabilidade...</p>
      </div>
    );
  }

  const kpis = metrics?.kpis || {};

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard de Observabilidade</h1>
            <p className="text-xs text-gray-400">
              Métricas de streaming, saúde dos provedores e observabilidade do sistema em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10"
          >
            <RefreshCw size={14} />
            <span>Atualizar</span>
          </button>

          <Link
            href="/admin/sources/tester"
            className="px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20"
          >
            <Zap size={14} />
            <span>Testar Fonte de Vídeo</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Animes</span>
            <Film size={18} className="text-[#FF6B00]" />
          </div>
          <p className="text-3xl font-black text-white">{kpis.animeCount || 0}</p>
          <p className="text-[10px] text-gray-400">Séries e filmes cadastrados</p>
        </div>

        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Episódios</span>
            <Tv size={18} className="text-[#FF6B00]" />
          </div>
          <p className="text-3xl font-black text-white">{kpis.episodeCount || 0}</p>
          <p className="text-[10px] text-gray-400">Episódios indexados</p>
        </div>

        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Fontes Ativas</span>
            <Server size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{kpis.activeSourcesCount || 0}</p>
          <p className="text-[10px] text-gray-400">De {kpis.totalSourcesCount || 0} fontes cadastradas</p>
        </div>

        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Índice de Saúde</span>
            <TrendingUp size={18} className="text-[#FF6B00]" />
          </div>
          <p className="text-3xl font-black text-white">{kpis.overallHealthScore || 100}%</p>
          <p className="text-[10px] text-emerald-400 font-bold">Provedores Operacionais</p>
        </div>
      </div>

      {/* Grid de Provedores e Observabilidade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status dos Provedores */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#FF6B00]" />
            <span>Saúde dos Provedores de Streaming</span>
          </h2>

          <ProviderStatus reports={metrics?.providerStats || []} />

          {/* Fontes Cadastradas Recentes */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-white/10 pb-3">
              <span>Últimas Fontes Adicionadas</span>
              <Link href="/admin/sources" className="text-xs text-[#FF6B00] hover:underline flex items-center gap-1">
                <span>Ver Todas</span>
                <ExternalLink size={12} />
              </Link>
            </h3>

            <div className="space-y-2">
              {metrics?.recentSources?.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Nenhuma fonte cadastrada recentemente.</p>
              ) : (
                metrics?.recentSources?.map((src: any) => (
                  <div
                    key={src.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {src.episode?.anime?.title || 'Anime'} — S{src.episode?.season}E{src.episode?.number}
                      </span>
                      <p className="text-[11px] text-gray-400">Provedor: {src.provider} | Tipo: {src.type.toUpperCase()}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        src.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {src.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Painel Lateral: Atalhos e Diagnóstico */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap size={20} className="text-[#FF6B00]" />
            <span>Ferramentas Rápidas</span>
          </h2>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <Link
              href="/admin/sources/tester"
              className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-3 block group"
            >
              <div className="p-2.5 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Testador Avançado de URLs</h4>
                <p className="text-[11px] text-gray-400">Valide links HLS/MP4 com mini-player</p>
              </div>
            </Link>

            <Link
              href="/admin/sources"
              className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-3 block group"
            >
              <div className="p-2.5 rounded-xl bg-white/10 text-gray-300 group-hover:bg-white/20 transition-all">
                <ListPlus size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Importador M3U em Lote</h4>
                <p className="text-[11px] text-gray-400">Importe playlists inteiras via arquivo</p>
              </div>
            </Link>

            <Link
              href="/admin/animes/novo"
              className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-3 block group"
            >
              <div className="p-2.5 rounded-xl bg-white/10 text-gray-300 group-hover:bg-white/20 transition-all">
                <Film size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cadastrar Anime (MAL)</h4>
                <p className="text-[11px] text-gray-400">Auto-preenchimento MyAnimeList</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
