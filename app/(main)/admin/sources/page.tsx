'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Upload,
  Plus,
  Activity,
  Loader2,
  FileCode,
  ListPlus,
  Zap,
  Radio,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
} from 'lucide-react';
import { ProviderStatus } from '@/components/ProviderStatus';
import { AutopilotPanel } from '@/components/admin/AutopilotPanel';

interface MediaProviderItem {
  id: string;
  name: string;
  type: string;
  url: string;
  priority: number;
  enabled: boolean;
  autoIndex: boolean;
  lastTestedAt?: string;
  lastStatus?: number;
  lastLatencyMs?: number;
}

export default function AdminSourcesPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'm3u' | 'json' | 'autopilot' | 'hosts'>('providers');
  const [providers, setProviders] = useState<MediaProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Domínios Autorizados
  const [mediaHostsData, setMediaHostsData] = useState<{
    envHosts: string[];
    providerHosts: string[];
    manualHosts: string[];
    allHosts: string[];
  }>({ envHosts: [], providerHosts: [], manualHosts: [], allHosts: [] });
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [newHostInput, setNewHostInput] = useState('');
  const [hostMsg, setHostMsg] = useState<string | null>(null);

  // Form para Novo Provedor
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState('M3U');
  const [newPropUrl, setNewPropUrl] = useState('');
  const [newPropPriority, setNewPropPriority] = useState(100);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Importar M3U Text Form
  const [m3uText, setM3uText] = useState('');
  const [providerName, setProviderName] = useState('authorized-m3u-main');
  const [audioLang, setAudioLang] = useState('ja');
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Testes de Provedores
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers) setProviders(data.providers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchMediaHosts = async () => {
    setLoadingHosts(true);
    try {
      const res = await fetch('/api/admin/media-hosts');
      const data = await res.json();
      if (res.ok) {
        setMediaHostsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHosts(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchMediaHosts();
  }, []);

  const handleAddHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostInput.trim()) return;

    try {
      const res = await fetch('/api/admin/media-hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: newHostInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setHostMsg('✅ Domínio autorizado com sucesso!');
        setNewHostInput('');
        fetchMediaHosts();
      } else {
        setHostMsg(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      setHostMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleDeleteHost = async (hostToRemove: string) => {
    if (!confirm(`Deseja remover o domínio manual "${hostToRemove}"?`)) return;
    try {
      const res = await fetch(`/api/admin/media-hosts?host=${encodeURIComponent(hostToRemove)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMediaHosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim() || !newPropUrl.trim()) return;

    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPropName,
          type: newPropType,
          url: newPropUrl,
          priority: newPropPriority,
          enabled: true,
          autoIndex: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateMsg('✅ Provedor cadastrado com sucesso!');
        setNewPropName('');
        setNewPropUrl('');
        fetchProviders();
      } else {
        setCreateMsg(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      setCreateMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleToggleState = async (id: string, key: 'enabled' | 'autoIndex', value: boolean) => {
    try {
      await fetch('/api/admin/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [key]: value }),
      });
      fetchProviders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Deseja realmente remover este provedor?')) return;
    try {
      await fetch(`/api/admin/providers?id=${id}`, { method: 'DELETE' });
      fetchProviders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestProvider = async (p: MediaProviderItem) => {
    setTestingId(p.id);
    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, url: p.url }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [p.id]: data }));
      fetchProviders();
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [p.id]: { ok: false, error: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

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
      if (!res.ok) throw new Error(data.error || 'Falha ao importar M3U');

      setImportMessage(`✅ Sucesso! Importados ${data.summary.importedCount} de ${data.summary.totalParsed} episódios.`);
      setM3uText('');
    } catch (err: any) {
      setImportMessage(`❌ Erro: ${err.message}`);
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
            <h1 className="text-2xl font-black text-white">Gestão de Provedores e Fontes de Mídia</h1>
            <p className="text-xs text-gray-400">
              Cadastre, edite, ative/desative e teste a conexão em tempo real de provedores M3U, JSON e APIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/sources/tester"
            className="px-4 py-2.5 rounded-xl bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF6B00] border border-[#FF6B00]/40 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Zap size={16} />
            <span>Testar Fonte de Vídeo</span>
          </Link>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'providers' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Radio size={16} />
          <span>Provedores Configuráveis ({providers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('autopilot')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'autopilot' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <Bot size={16} />
          <span>Modo Automático (Autopilot)</span>
        </button>

        <button
          onClick={() => setActiveTab('m3u')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'm3u' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <ListPlus size={16} />
          <span>Importar M3U Texto</span>
        </button>

        <button
          onClick={() => setActiveTab('hosts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'hosts' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:bg-white/5'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Mídias Autorizadas ({mediaHostsData.allHosts.length})</span>
        </button>
      </div>

      {/* Conteúdo Aba 1: Provedores Configuráveis */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {/* Formulário de Cadastro de Novo Provedor */}
          <form onSubmit={handleCreateProvider} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Plus size={18} className="text-[#FF6B00]" />
              <span>Cadastrar Novo Provedor de Mídia</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Provedor</label>
                <input
                  type="text"
                  placeholder="Ex: Servidor HLS Principal BR"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Tipo de Provedor</label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                >
                  <option value="M3U">Playlist M3U / M3U8</option>
                  <option value="JSON">Catálogo JSON</option>
                  <option value="EXTERNAL_API">API REST Externa</option>
                  <option value="EMBED">Player iFrame / Embed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Prioridade (0 - 100)</label>
                <input
                  type="number"
                  value={newPropPriority}
                  onChange={(e) => setNewPropPriority(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">URL do Provedor / Playlist</label>
              <input
                type="url"
                placeholder="https://media.mydomain.com/playlists/main.m3u"
                value={newPropUrl}
                onChange={(e) => setNewPropUrl(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            {createMsg && (
              <p className="text-xs font-bold p-2.5 rounded-xl bg-white/5 border border-white/10">{createMsg}</p>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Salvar Provedor</span>
            </button>
          </form>

          {/* Tabela de Provedores Cadastrados */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white border-b border-white/10 pb-3">
              Provedores Cadastrados e Status de Teste
            </h2>

            {loadingProviders ? (
              <div className="py-8 text-center">
                <Loader2 size={24} className="text-[#FF6B00] animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((p) => {
                  const testRes = testResults[p.id];

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">{p.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-[10px] text-gray-300">
                            {p.type}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] font-bold text-[10px]">
                            Prioridade: {p.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono truncate">{p.url}</p>

                        {/* Estatísticas do último teste */}
                        {(p.lastTestedAt || testRes) && (
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-gray-500" />
                              <span>
                                Testado:{' '}
                                {p.lastTestedAt
                                  ? new Date(p.lastTestedAt).toLocaleTimeString('pt-BR')
                                  : 'Agora'}
                              </span>
                            </span>

                            {testRes?.ok || (p.lastStatus && p.lastStatus < 400) ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>
                                  HTTP {testRes?.status || p.lastStatus} ({testRes?.latencyMs || p.lastLatencyMs}ms)
                                </span>
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <XCircle size={12} />
                                <span>
                                  Falha (HTTP {testRes?.status || p.lastStatus || 504})
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Controles de Ação */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Botão Testar Conexão Ao Vivo */}
                        <button
                          onClick={() => handleTestProvider(p)}
                          disabled={testingId === p.id}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {testingId === p.id ? (
                            <Loader2 size={13} className="animate-spin text-[#FF6B00]" />
                          ) : (
                            <Play size={13} className="text-[#FF6B00]" />
                          )}
                          <span>Testar Conexão</span>
                        </button>

                        {/* Toggle Enabled */}
                        <button
                          onClick={() => handleToggleState(p.id, 'enabled', !p.enabled)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                            p.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                        >
                          {p.enabled ? 'Ativo' : 'Inativo'}
                        </button>

                        {/* Toggle AutoIndex */}
                        <button
                          onClick={() => handleToggleState(p.id, 'autoIndex', !p.autoIndex)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                            p.autoIndex
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}
                          title="Auto-indexação pelo robô"
                        >
                          AutoRobô: {p.autoIndex ? 'ON' : 'OFF'}
                        </button>

                        {/* Deletar */}
                        <button
                          onClick={() => handleDeleteProvider(p.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remover Provedor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Autopilot */}
      {activeTab === 'autopilot' && <AutopilotPanel />}

      {/* Conteúdo Aba 3: Importar M3U Texto */}
      {activeTab === 'm3u' && (
        <div className="space-y-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Upload size={18} className="text-[#FF6B00]" />
            <span>Importação em Lote via Playlist M3U</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Provedor</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Idioma Padrão do Áudio</label>
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
            <label className="block text-xs font-bold text-gray-300 mb-1">Conteúdo do Arquivo M3U Autorizado</label>
            <textarea
              rows={8}
              value={m3uText}
              onChange={(e) => setM3uText(e.target.value)}
              placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;https://cdn.exemplo.com/poster.jpg&quot;,Anime Exemplo - S01E01&#10;https://media.exemplo.com/anime/s01e01/master.m3u8"
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          {importMessage && (
            <p className="text-xs font-bold p-3 rounded-xl bg-white/5 border border-white/10">{importMessage}</p>
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

      {/* Conteúdo Aba 4: Mídias Autorizadas (Domínios Confiáveis) */}
      {activeTab === 'hosts' && (
        <div className="space-y-6">
          {/* Formulário para Adicionar Domínio Manual */}
          <form onSubmit={handleAddHost} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck size={18} className="text-[#FF6B00]" />
              <span>Autorizar Novo Domínio de Mídia</span>
            </h2>

            <p className="text-xs text-gray-400">
              Adicione o hostname ou URL de um servidor de streaming para permitir a reprodução de mídias mantendo a proteção SSRF.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ex: cdn.servidor-externo.com ou https://media.provedor.com/feed.m3u8"
                value={newHostInput}
                onChange={(e) => setNewHostInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} />
                <span>Autorizar Domínio</span>
              </button>
            </div>

            {hostMsg && (
              <p className="text-xs font-bold p-2.5 rounded-xl bg-white/5 border border-white/10">{hostMsg}</p>
            )}
          </form>

          {/* Lista Unificada de Hosts Autorizados */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Lista Ativa de Hosts de Mídia Autorizados</h2>
                <p className="text-xs text-gray-400">Domínios autorizados combinando .env, extração de Provedores e cadastros Manuais</p>
              </div>
              {loadingHosts && <Loader2 size={18} className="text-[#FF6B00] animate-spin" />}
            </div>

            {mediaHostsData.allHosts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">Nenhum host de mídia cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {mediaHostsData.allHosts.map((h) => {
                  const isEnv = mediaHostsData.envHosts.includes(h);
                  const isProvider = mediaHostsData.providerHosts.includes(h);
                  const isManual = mediaHostsData.manualHosts.includes(h);

                  return (
                    <div
                      key={h}
                      className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1 truncate">
                        <span className="font-mono text-xs font-bold text-white block truncate">{h}</span>

                        <div className="flex flex-wrap gap-1">
                          {isEnv && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                              ENV (.env)
                            </span>
                          )}
                          {isProvider && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              PROVEDOR
                            </span>
                          )}
                          {isManual && (
                            <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 text-[10px] font-bold">
                              MANUAL
                            </span>
                          )}
                        </div>
                      </div>

                      {isManual && (
                        <button
                          onClick={() => handleDeleteHost(h)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                          title="Remover host manual"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
