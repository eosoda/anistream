'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  Plus,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCode,
  ListPlus,
} from 'lucide-react';
import { ProviderStatus } from '@/components/ProviderStatus';
import { ProviderHealth } from '@/lib/streams/types';

export default function AdminSourcesPage() {
  const [activeTab, setActiveTab] = useState<'m3u' | 'json' | 'health'>('m3u');
  const [m3uText, setM3uText] = useState('');
  const [providerName, setProviderName] = useState('authorized-m3u-main');
  const [audioLang, setAudioLang] = useState('ja');
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [healthReports, setHealthReports] = useState<ProviderHealth[]>([]);

  // Importar Playlist M3U Autorizada
  const handleImportM3u = async () => {
    if (!m3uText.trim()) return;

    setLoading(true);
    setImportMessage(null);

    try {
      const res = await fetch('/api/admin/import-m3u', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer super-secret-admin-key-min-32-chars-long',
        },
        body: JSON.stringify({
          content: m3uText,
          defaultProviderName: providerName,
          defaultAudioLanguage: audioLang,
          defaultQuality: '1080p',
          requiresProxy: false,
          priority: 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao importar M3U');
      }

      setImportMessage(
        `✅ Sucesso! Importados ${data.summary.importedCount} de ${data.summary.totalParsed} episódios.`
      );
      setM3uText('');
    } catch (err: any) {
      setImportMessage(`❌ Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Executar Health Check dos Provedores
  const handleRunHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/streams/health', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer super-secret-admin-key-min-32-chars-long',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setHealthReports(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Administrativo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              Painel de Gestão de Fontes Autorizadas
            </h1>
            <p className="text-xs text-gray-400">
              Cadastre, importe e monitore fontes de streaming de mídia autorizadas
            </p>
          </div>
        </div>

        <button
          onClick={handleRunHealthCheck}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} className="text-[#FF6B00]" />}
          <span>Verificar Saúde dos Provedores</span>
        </button>
      </div>

      {/* Exibição de Health Check */}
      {healthReports.length > 0 && <ProviderStatus reports={healthReports} />}

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('m3u')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'm3u'
              ? 'bg-[#FF6B00] text-white'
              : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <ListPlus size={16} />
          <span>Importar M3U</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'json'
              ? 'bg-[#FF6B00] text-white'
              : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <FileCode size={16} />
          <span>Configuração JSON</span>
        </button>
      </div>

      {/* Conteúdo Aba M3U */}
      {activeTab === 'm3u' && (
        <div className="space-y-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Upload size={18} className="text-[#FF6B00]" />
            <span>Importação em Lote via Playlist M3U</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Nome do Provedor
              </label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Idioma Padrão do Áudio
              </label>
              <select
                value={audioLang}
                onChange={(e) => setAudioLang(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              >
                <option value="ja">Japonês (ja)</option>
                <option value="pt-BR">Português BR (pt-BR)</option>
                <option value="en">Inglês (en)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Conteúdo do Arquivo M3U Autorizado
            </label>
            <textarea
              rows={8}
              value={m3uText}
              onChange={(e) => setM3uText(e.target.value)}
              placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;https://cdn.exemplo.com/poster.jpg&quot;,Anime Exemplo - S01E01&#10;https://media.exemplo.com/anime/s01e01/master.m3u8"
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          {importMessage && (
            <p className="text-xs font-bold p-3 rounded-xl bg-white/5 border border-white/10">
              {importMessage}
            </p>
          )}

          <button
            onClick={handleImportM3u}
            disabled={loading || !m3uText.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span>Processar Importação</span>
          </button>
        </div>
      )}
    </div>
  );
}
