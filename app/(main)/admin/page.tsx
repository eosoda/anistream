'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Compass,
  Film,
  Tv,
  ListPlus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Server,
  Zap,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Megaphone,
  Crop,
  Database,
  Radio,
  Send,
  Wrench,
  FileText,
  Download,
  Upload,
  BarChart2,
  Check,
  X,
} from 'lucide-react';
import { ProviderStatus } from '@/components/ProviderStatus';
import { ImageCropModal } from '@/components/admin/ImageCropModal';
import { useConfirmation } from '@/context/ConfirmationContext';

export default function AdminDashboardPage() {
  const { alert } = useConfirmation();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States para Funcionalidades Admin
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementType, setAnnouncementType] = useState('INFO');
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('Estamos em manutenção para atualização de servidores.');

  const [deadLinksMsg, setDeadLinksMsg] = useState<string | null>(null);
  const [isScanningDeadLinks, setIsScanningDeadLinks] = useState(false);

  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);

  const [releaseVersion, setReleaseVersion] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseContent, setReleaseContent] = useState('');
  const [releaseMsg, setReleaseMsg] = useState<string | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);

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

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const [circuitStatuses, setCircuitStatuses] = useState<any[]>([]);
  const [resettingCircuit, setResettingCircuit] = useState(false);

  const fetchCircuitStatuses = async () => {
    try {
      const res = await fetch('/api/admin/circuit-breaker');
      const json = await res.json();
      if (json?.data?.providers) {
        setCircuitStatuses(json.data.providers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetCircuit = async (providerName: string) => {
    setResettingCircuit(true);
    try {
      await fetch('/api/admin/circuit-breaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName }),
      });
      await fetchCircuitStatuses();
    } catch (err) {
      console.error(err);
    } finally {
      setResettingCircuit(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchReports();
    fetchCircuitStatuses();
  }, []);

  // Handlers
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          type: announcementType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncementMsg('✅ Anúncio publicado com sucesso!');
        setAnnouncementTitle('');
        setAnnouncementContent('');
      }
    } catch (err: any) {
      setAnnouncementMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    setMaintenanceEnabled(enabled);
    try {
      await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          message: maintenanceMsg,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleScanDeadLinks = async () => {
    setIsScanningDeadLinks(true);
    setDeadLinksMsg(null);
    try {
      const res = await fetch('/api/admin/dead-links', { method: 'POST' });
      const data = await res.json();
      setDeadLinksMsg(data.message || 'Varredura concluída!');
      fetchMetrics();
    } catch (err: any) {
      setDeadLinksMsg(`Erro: ${err.message}`);
    } finally {
      setIsScanningDeadLinks(false);
    }
  };

  const handleExportBackup = () => {
    window.location.href = '/api/admin/backup';
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/admin/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonContent),
        });
        const data = await res.json();
        if (res.ok) {
          setBackupMsg(`✅ Backup restaurado: ${data.message}`);
          fetchMetrics();
        } else {
          setBackupMsg(`❌ Erro: ${data.error}`);
        }
      } catch (err: any) {
        setBackupMsg(`❌ Erro no JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName.trim() || !webhookUrl.trim()) return;

    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookName,
          url: webhookUrl,
          platform: webhookUrl.includes('discord') ? 'DISCORD' : 'TELEGRAM',
        }),
      });
      if (res.ok) {
        setWebhookMsg('✅ Webhook cadastrado com sucesso!');
        setWebhookName('');
        setWebhookUrl('');
      }
    } catch (err: any) {
      setWebhookMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseVersion || !releaseTitle || !releaseContent) return;

    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: releaseVersion,
          title: releaseTitle,
          content: releaseContent,
        }),
      });
      if (res.ok) {
        setReleaseMsg('✅ Release publicada na página /changelog!');
        setReleaseVersion('');
        setReleaseTitle('');
        setReleaseContent('');
      }
    } catch (err: any) {
      setReleaseMsg(`❌ Erro: ${err.message}`);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Carregando métricas do painel administrativo...</p>
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
            <h1 className="text-2xl font-black text-white">Painel de Gestão & Observabilidade</h1>
            <p className="text-xs text-gray-400">
              Controle de transmissão, reports, backups, scraping e avisos em lote do AniStream
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
            href="/admin/navigation"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10"
          >
            <Compass size={14} className="text-[#FF6B00]" />
            <span>Personalizar Menus & Páginas</span>
          </Link>

          <Link
            href="/admin/sources/tester"
            className="px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#FF6B00]/20"
          >
            <Zap size={14} />
            <span>Testar Fonte de Vídeo</span>
          </Link>
        </div>
      </div>

      {/* Circuit Breaker Health Status Widget */}
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={20} className="text-[#FF6B00]" />
            <h2 className="text-base font-bold text-white">Saúde das APIs & Circuit Breaker</h2>
          </div>
          <span className="text-xs text-gray-400 font-semibold">Monitoramento em Tempo Real</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {circuitStatuses.map((item) => {
            const isOpen = item.state === 'OPEN';
            return (
              <div
                key={item.provider}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isOpen
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">{item.provider}</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {isOpen ? '🔴 Circuito Aberto (Fallback Local)' : '🟢 Operacional (Conectado)'}
                  </p>
                </div>

                {isOpen && (
                  <button
                    onClick={() => handleResetCircuit(item.provider)}
                    disabled={resettingCircuit}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={resettingCircuit ? 'animate-spin' : ''} />
                    <span>Resetar</span>
                  </button>
                )}
              </div>
            );
          })}
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
            <span className="text-xs font-bold uppercase tracking-wider">Chamados Pendentes</span>
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">
            {reports.filter((r) => r.status === 'PENDING').length}
          </p>
          <p className="text-[10px] text-gray-400">Relatos de erro no player</p>
        </div>
      </div>

      {/* Seção 1: Notificações em Lote & Modo Manutenção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notificações em Lote */}
        <form onSubmit={handleCreateAnnouncement} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Megaphone size={20} className="text-[#FF6B00]" />
            <span>Gerenciador de Notificações em Lote (Broadcast)</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Título do Anúncio</label>
            <input
              type="text"
              placeholder="Ex: Manutenção Programada / Novo Lançamento"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-300 mb-1">Conteúdo do Aviso</label>
              <input
                type="text"
                placeholder="Mensagem exibida no banner superior..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Tipo</label>
              <select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              >
                <option value="INFO">Informativo (Laranja)</option>
                <option value="WARNING">Alerta (Amarelo)</option>
                <option value="SUCCESS">Sucesso (Verde)</option>
              </select>
            </div>
          </div>

          {announcementMsg && (
            <p className="text-xs font-bold text-emerald-400 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              {announcementMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Send size={14} />
            <span>Publicar Anúncio Global</span>
          </button>
        </form>

        {/* Modo Manutenção & Backup JSON */}
        <div className="space-y-6">
          {/* Modo Manutenção */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Wrench size={20} className="text-amber-400" />
              <span>Modo Manutenção Agendado</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Mensagem de Manutenção</label>
              <input
                type="text"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-300 font-bold">Status do Modo Manutenção:</span>
              <button
                type="button"
                onClick={() => handleToggleMaintenance(!maintenanceEnabled)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  maintenanceEnabled
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {maintenanceEnabled ? 'Manutenção ATIVA (Bloqueando Públicos)' : 'Desativado (Normal)'}
              </button>
            </div>
          </div>

          {/* Backup e Restauração JSON */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Database size={20} className="text-sky-400" />
              <span>Backup e Restauração (Dump JSON)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Download size={16} className="text-[#FF6B00]" />
                <span>Exportar Backup JSON</span>
              </button>

              <label className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={16} className="text-emerald-400" />
                <span>Restaurar Backup</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>

            {backupMsg && (
              <p className="text-xs font-bold p-2.5 rounded-xl bg-white/5 border border-white/10">{backupMsg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Seção 2: Dead Link Finder & Reports de Erro do Usuário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dead Link Finder */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio size={20} className="text-red-400" />
              <span>Detector de Links Quebrados (Dead Link Finder)</span>
            </h2>
            <button
              onClick={handleScanDeadLinks}
              disabled={isScanningDeadLinks}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isScanningDeadLinks ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Executar Varredura</span>
            </button>
          </div>

          {deadLinksMsg && (
            <p className="text-xs font-bold text-amber-400 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              {deadLinksMsg}
            </p>
          )}

          <p className="text-xs text-gray-400">
            A varredura testa links ativos em lote. Se uma fonte falhar 3 vezes consecutivas, é marcada como inativa.
          </p>
        </div>

        {/* Reports de Erro no Player */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <AlertTriangle size={20} className="text-amber-400" />
            <span>Fila de Suporte: Reports de Erro no Player</span>
          </h2>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Nenhum chamado de erro pendente.</p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs gap-2"
                >
                  <div>
                    <span className="font-bold text-white">
                      {report.episode?.anime?.title || 'Anime'} — Ep {report.episode?.number}
                    </span>
                    <p className="text-[11px] text-amber-400 font-semibold">Tipo: {report.type}</p>
                    {report.description && <p className="text-[10px] text-gray-400">{report.description}</p>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {report.status === 'PENDING' ? (
                      <button
                        onClick={() => handleUpdateReportStatus(report.id, 'RESOLVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold"
                      >
                        Marcar Resolvido
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        Resolvido
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Seção 3: Webhooks & Changelog Release Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Webhooks Discord / Telegram */}
        <form onSubmit={handleAddWebhook} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Radio size={20} className="text-[#FF6B00]" />
            <span>Gerenciador de Webhooks (Discord / Telegram)</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Nome da Integração</label>
            <input
              type="text"
              placeholder="Ex: Servidor Discord Oficial"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">URL do Webhook</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
            />
          </div>

          {webhookMsg && (
            <p className="text-xs font-bold text-emerald-400 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              {webhookMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <PlusIcon />
            <span>Cadastrar Webhook</span>
          </button>
        </form>

        {/* Publicador de Notas de Versão (Changelog) */}
        <form onSubmit={handleCreateRelease} className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText size={20} className="text-sky-400" />
            <span>Publicador de Release Notes (/changelog)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Versão</label>
              <input
                type="text"
                placeholder="v1.2.0"
                value={releaseVersion}
                onChange={(e) => setReleaseVersion(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-300 mb-1">Título da Release</label>
              <input
                type="text"
                placeholder="Ex: Novo Player e Sistema de Reports"
                value={releaseTitle}
                onChange={(e) => setReleaseTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">Descrição em Markdown</label>
            <textarea
              rows={3}
              placeholder="- Adicionado player HLS&#10;- Corrigidos links quebrados..."
              value={releaseContent}
              onChange={(e) => setReleaseContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white font-mono"
            />
          </div>

          {releaseMsg && (
            <p className="text-xs font-bold text-emerald-400 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              {releaseMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Send size={14} />
            <span>Publicar Release no /changelog</span>
          </button>
        </form>
      </div>

      {/* Editor de Cortar Capas Modal Demo Button */}
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
            <Crop size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Editor Visual de Capas e Posters</h3>
            <p className="text-xs text-gray-400">Ferramenta interativa de ajuste visual nos aspectos 3:4 e 16:9</p>
          </div>
        </div>

        <button
          onClick={() => setShowCropModal(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2"
        >
          <Crop size={14} />
          <span>Abrir Crop Editor</span>
        </button>
      </div>

      {/* Componente Modal Crop */}
      <ImageCropModal
        imageUrl="https://picsum.photos/600/400"
        aspectRatio="poster"
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        onSave={() =>
          alert({
            title: 'Recorte aplicado',
            description: 'O novo enquadramento visual foi aplicado à prévia.',
            buttonText: 'Concluir',
            variant: 'primary',
          })
        }
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
