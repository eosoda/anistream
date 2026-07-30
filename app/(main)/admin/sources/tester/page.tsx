'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Globe,
  Clock,
  FileCode,
} from 'lucide-react';
import { VideoPlayer } from '@/components/player/VideoPlayer';

export default function AdminStreamTesterPage() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'hls' | 'mp4'>('hls');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/sources/test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), type }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        valid: false,
        ssrfPass: false,
        error: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
      {/* Botão de Voltar */}
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Voltar ao Dashboard</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Zap size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Testador Avançado de Fontes de Vídeo</h1>
            <p className="text-xs text-gray-400">
              Valide links HLS/MP4, verifique a proteção SSRF e visualize o stream em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Formulário de Teste */}
      <form onSubmit={handleTestUrl} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-gray-300 mb-1">
              URL da Fonte de Vídeo (HLS .m3u8 ou MP4)
            </label>
            <input
              type="url"
              required
              placeholder="https://seu-servidor.com/stream/master.m3u8"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Tipo de Stream</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'hls' | 'mp4')}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            >
              <option value="hls">HLS (.m3u8)</option>
              <option value="mp4">MP4 (.mp4)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={testing || !url.trim()}
          className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
        >
          {testing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Zap size={16} />
              <span>Executar Diagnóstico Completo</span>
            </>
          )}
        </button>
      </form>

      {/* Resultados do Diagnóstico */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status SSRF */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Segurança SSRF</span>
                <Globe size={18} className={result.ssrfPass ? 'text-emerald-400' : 'text-red-400'} />
              </div>
              <p className="text-lg font-black text-white">
                {result.ssrfPass ? 'Aprovada (Host Autorizado)' : 'Rejeitada'}
              </p>
              {result.resolvedIp && (
                <p className="text-[10px] text-gray-400 font-mono">IP: {result.resolvedIp}</p>
              )}
            </div>

            {/* Status HTTP */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Resposta HTTP</span>
                <FileCode size={18} className={result.valid ? 'text-emerald-400' : 'text-amber-400'} />
              </div>
              <p className="text-lg font-black text-white">
                {result.status ? `HTTP ${result.status}` : 'Sem Resposta'}
              </p>
              <p className="text-[10px] text-gray-400">
                {result.isMasterPlaylist ? 'Master Playlist Variantes (#EXT-X-STREAM-INF)' : 'Stream Direto'}
              </p>
            </div>

            {/* Latência */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Latência de Ping</span>
                <Clock size={18} className="text-[#FF6B00]" />
              </div>
              <p className="text-lg font-black text-[#FF6B00]">{result.latencyMs || 0} ms</p>
              <p className="text-[10px] text-gray-400">Tempo de resposta do servidor</p>
            </div>
          </div>

          {result.error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>Diagnóstico: {result.error}</span>
            </div>
          )}

          {/* Mini-Player de Pré-Visualização */}
          {result.valid && (
            <div className="space-y-3 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play size={16} className="text-[#FF6B00]" />
                <span>Mini-Player de Pré-Visualização (Admin Preview)</span>
              </h3>

              <div className="max-w-3xl mx-auto">
                <VideoPlayer playbackUrl={url} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
