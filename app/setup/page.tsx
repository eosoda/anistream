'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Database,
  User,
  Globe,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Mail,
  RefreshCcw,
  KeyRound,
  Eye,
  EyeOff,
  Download,
  Film,
  Play,
} from 'lucide-react';
import { parseM3uContent } from '@/lib/streams/m3u-parser';

export const dynamic = 'force-dynamic';

function getPasswordStrength(password: string) {
  if (!password) {
    return { label: '', color: 'bg-gray-700', text: 'text-gray-400', percentage: 0 };
  }
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Fraca (mín. 6 caracteres)', color: 'bg-red-500', text: 'text-red-400', percentage: 20 };
  }
  if (score === 2) {
    return { label: 'Razoável', color: 'bg-amber-500', text: 'text-amber-400', percentage: 40 };
  }
  if (score === 3) {
    return { label: 'Boa', color: 'bg-yellow-400', text: 'text-yellow-400', percentage: 65 };
  }
  if (score === 4) {
    return { label: 'Forte', color: 'bg-[#FF6B00]', text: 'text-[#FF6B00]', percentage: 85 };
  }
  return { label: 'Excelente', color: 'bg-emerald-500', text: 'text-emerald-400', percentage: 100 };
}

function SetupWizardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [postgresPingMs, setPostgresPingMs] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    adminCount: number;
    animeCount: number;
    episodeCount: number;
    sourceCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [setupKey, setSetupKey] = useState('');
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [mediaHosts, setMediaHosts] = useState('');
  const [m3uContent, setM3uContent] = useState('');
  const [m3uStats, setM3uStats] = useState<{ totalEntries: number; uniqueAnimes: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [providerName, setProviderName] = useState('authorized-m3u-main');

  const [isSeedingPopular, setIsSeedingPopular] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const [setupProviders, setSetupProviders] = useState<any[]>([]);
  const [testingSetupProviderId, setTestingSetupProviderId] = useState<string | null>(null);
  const [setupProviderTestResults, setSetupProviderTestResults] = useState<Record<string, any>>({});

  const fetchSetupProviders = async () => {
    try {
      const res = await fetch('/api/admin/providers');
      const data = await res.json();
      if (data.providers) setSetupProviders(data.providers);
    } catch (e) {}
  };

  // Inicializar a chave de segurança a partir da URL (?key=...) se disponível
  useEffect(() => {
    const urlKey = searchParams.get('key');
    if (urlKey) {
      setSetupKey(urlKey);
    }
  }, [searchParams]);

  // Check initial system status & DB ping
  const checkStatus = async () => {
    setTestingDb(true);
    try {
      const keyQuery = setupKey ? `?key=${encodeURIComponent(setupKey)}` : '';
      const res = await fetch(`/api/setup/status${keyQuery}`);
      const data = await res.json();

      if (data.isInitialized) {
        router.replace('/admin/login');
        return;
      }

      setDbConnected(data.dbConnected);
      setPostgresPingMs(data.postgresPingMs || 0);
      setStats(data.stats || null);
      if (setupKey) {
        setKeyValid(data.keyValid);
      }
      fetchSetupProviders();
    } catch {
      setDbConnected(false);
      setPostgresPingMs(null);
    } finally {
      setTestingDb(false);
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [router, setupKey]);

  // Testar Provedor no Setup
  const handleTestSetupProvider = async (p: any) => {
    setTestingSetupProviderId(p.id);
    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, url: p.url }),
      });
      const data = await res.json();
      setSetupProviderTestResults((prev) => ({ ...prev, [p.id]: data }));
    } catch (err: any) {
      setSetupProviderTestResults((prev) => ({ ...prev, [p.id]: { ok: false, error: err.message } }));
    } finally {
      setTestingSetupProviderId(null);
    }
  };

  // Alternar Provedor no Setup
  const handleToggleSetupProvider = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/admin/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      fetchSetupProviders();
    } catch (e) {}
  };

  // Validação prévia de M3U
  const handleValidateM3u = () => {
    if (!m3uContent || !m3uContent.trim()) {
      setM3uStats(null);
      return;
    }
    const items = parseM3uContent(m3uContent);
    const uniqueTitles = new Set(items.map((i) => i.normalizedTitle));
    setM3uStats({
      totalEntries: items.length,
      uniqueAnimes: uniqueTitles.size,
    });
  };

  // Baixar Resumo do Setup (.txt)
  const handleDownloadSummary = () => {
    const summaryText = `===================================================================
AniStream - Resumo da Instalação do Sistema
Data de Instalação: ${new Date().toLocaleString('pt-BR')}
===================================================================

[CONFIGURAÇÕES DO ADMINISTRADOR MESTRE]
Nome               : ${adminName || 'Administrador Principal'}
E-mail             : ${adminEmail}
Status da Conta    : Ativa (Super Admin)

[CONFIGURAÇÕES DO SISTEMA]
URL da Aplicação   : ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
Painel Admin       : ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/admin/login
Hosts de Mídia     : ${mediaHosts}

[IMPORTANTE]
- Guarde este arquivo em local seguro.
- Para gerenciar animes, playlists e servidores de streaming, acesse o painel administrativo.
===================================================================
`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anistream-resumo-instalacao-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Seed de Animes Populares
  const handleSeedPopularAnimes = async () => {
    setIsSeedingPopular(true);
    setSeedSuccess(null);
    try {
      const res = await fetch('/api/setup/seed-popular', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao popular catálogo');
      setSeedSuccess(`Sucesso! ${data.seededCount || 25} animes populares foram adicionados ao seu catálogo.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSeedingPopular(false);
    }
  };

  // Upload M3U File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setM3uContent(content);
    };
    reader.readAsText(file);
  };

  // Handle final installation submission
  const handleCompleteSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupKey,
          admin: {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
          },
          mediaHosts,
          m3uContent,
          providerName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha na inicialização da aplicação');
      }

      setCurrentStep(5); // Success step
      setTimeout(() => {
        router.push('/admin/sources');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="py-20 text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Verificando status do sistema...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-4 sm:py-6">
      <div className="w-full max-w-2xl p-8 rounded-3xl bg-white/5 border border-white/10 glass-panel shadow-2xl space-y-8 relative overflow-hidden">
        {/* Header com Progresso */}
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-black text-white">Assistente de Instalação Inicial</h1>
          <p className="text-xs text-gray-400">
            Configure seu banco de dados, chave de segurança e conta mestre em poucas etapas
          </p>

          {/* Barra de Progresso */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentStep >= step ? 'bg-[#FF6B00]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Passo 1: Validação de Segurança & Banco de Dados */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Campo da Chave de Segurança */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300">
                Chave de Instalação (Setup Key)
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-[#FF6B00]" />
                <input
                  type="text"
                  placeholder="Ex: setup_a8f94b2c9e1d3f5a"
                  value={setupKey}
                  onChange={(e) => {
                    setSetupKey(e.target.value);
                    setKeyValid(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                Consulte os logs do container Docker (`docker logs anistream_app`) para visualizar a chave randômica impressa na inicialização.
              </p>
            </div>

            {/* Status da Conexão PostgreSQL */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={24} className="text-[#FF6B00]" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Conexão PostgreSQL</h3>
                    <p className="text-xs text-gray-400">
                      {dbConnected
                        ? `Conectado! Latência: ${postgresPingMs}ms`
                        : 'Falha ao conectar no PostgreSQL. Verifique DATABASE_URL.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={checkStatus}
                    disabled={testingDb}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                    title="Testar Conexão em Tempo Real"
                  >
                    <RefreshCcw size={16} className={testingDb ? 'animate-spin' : ''} />
                  </button>

                  {dbConnected ? (
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  ) : (
                    <AlertTriangle size={24} className="text-red-400" />
                  )}
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Animes</span>
                    <span className="text-xs font-mono font-bold text-white">{stats.animeCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Episódios</span>
                    <span className="text-xs font-mono font-bold text-white">{stats.episodeCount}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Fontes</span>
                    <span className="text-xs font-mono font-bold text-white">{stats.sourceCount}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={!dbConnected || !setupKey.trim()}
              onClick={() => setCurrentStep(2)}
              className="w-full py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>Avançar para Conta do Administrador</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Passo 2: Conta do Administrador */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: Administrador Principal"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">E-mail do Administrador</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  placeholder="admin@anistream.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Senha (Mínimo 6 caracteres)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha de acesso"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition-all"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Força da Senha:</span>
                    <span className={`font-bold ${getPasswordStrength(adminPassword).text}`}>
                      {getPasswordStrength(adminPassword).label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getPasswordStrength(adminPassword).color}`}
                      style={{ width: `${getPasswordStrength(adminPassword).percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Repetir Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a mesma senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/50 border text-xs text-white placeholder-gray-500 focus:outline-none ${
                    confirmPassword && confirmPassword !== adminPassword
                      ? 'border-red-500/60 focus:border-red-500'
                      : confirmPassword && confirmPassword === adminPassword
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : 'border-white/10 focus:border-[#FF6B00]'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition-all"
                  title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {confirmPassword === adminPassword ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">As senhas coincidem</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} className="text-red-400" />
                      <span className="text-red-400 font-semibold">As senhas não coincidem</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>

              <button
                disabled={
                  !adminName.trim() ||
                  !adminEmail.trim() ||
                  adminPassword.length < 6 ||
                  confirmPassword !== adminPassword
                }
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <span>Avançar para Configuração de Hosts</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Passo 3: Configuração de Hosts Autorizados */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Hosts de Mídia Autorizados (Separados por vírgula)
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: cdn.seudominio.com, media.seudominio.com (Opcional - Provedores ativos são autorizados automaticamente)"
                  value={mediaHosts}
                  onChange={(e) => setMediaHosts(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Apenas URLs pertencentes a estes domínios serão aceitas pelo proxy de mídia SSRF.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-[#FF6B00] text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Avançar para Importação M3U</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Passo 4: Importação e Fontes de Mídia Configuráveis */}
        {currentStep === 4 && (
          <div className="space-y-5">
            {/* Seção de Provedores Configuráveis */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between border-b border-white/10 pb-2">
                <span>Provedores de Mídia Pré-Configurados ({setupProviders.length})</span>
                <span className="text-[10px] text-[#FF6B00]">Configuráveis & Testáveis</span>
              </h3>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {setupProviders.map((p) => {
                  const testRes = setupProviderTestResults[p.id];
                  const isTesting = testingSetupProviderId === p.id;

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{p.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-gray-300">
                            {p.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono truncate">{p.url}</p>

                        {testRes && (
                          <div className="text-[10px] font-bold">
                            {testRes.ok ? (
                              <span className="text-emerald-400">
                                HTTP {testRes.status} ({testRes.latencyMs}ms OK)
                              </span>
                            ) : (
                              <span className="text-red-400">Falha na conexão</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestSetupProvider(p)}
                          disabled={isTesting}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center gap-1"
                        >
                          {isTesting ? (
                            <Loader2 size={12} className="animate-spin text-[#FF6B00]" />
                          ) : (
                            <Play size={12} className="text-[#FF6B00]" />
                          )}
                          <span>Testar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSetupProvider(p.id, !p.enabled)}
                          className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase border ${
                            p.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                        >
                          {p.enabled ? 'Ativo' : 'Off'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Upload de Arquivo .m3u / .m3u8 do Computador
              </label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/20 hover:border-[#FF6B00] rounded-2xl cursor-pointer bg-black/40 transition-all">
                <Upload size={24} className="text-[#FF6B00] mb-1" />
                <span className="text-xs font-bold text-gray-300">
                  {fileName ? `Arquivo: ${fileName}` : 'Clique para selecionar arquivo .m3u ou .m3u8'}
                </span>
                <input
                  type="file"
                  accept=".m3u,.m3u8"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-300">
                  Ou Cole o Conteúdo da Playlist M3U Autorizada
                </label>
                <button
                  type="button"
                  onClick={handleValidateM3u}
                  disabled={!m3uContent.trim()}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-40"
                >
                  <Sparkles size={12} className="text-[#FF6B00]" />
                  <span>Validar M3U</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={m3uContent}
                onChange={(e) => {
                  setM3uContent(e.target.value);
                  if (m3uStats) setM3uStats(null);
                }}
                placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;https://cdn.exemplo.com/poster.jpg&quot;,Anime Exemplo S01E01&#10;https://media.exemplo.com/s01e01/master.m3u8"
                className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-gray-200"
              />

              {m3uStats && (
                <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
                  <span>Prévia M3U Analisada:</span>
                  <span>{m3uStats.uniqueAnimes} animes / {m3uStats.totalEntries} episódios encontrados</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>

              <button
                disabled={loading}
                onClick={handleCompleteSetup}
                className="px-6 py-2.5 rounded-xl bg-[#FF6B00] text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Concluir Instalação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Passo 5: Sucesso & Conclusão */}
        {currentStep === 5 && (
          <div className="text-center space-y-6 py-6">
            <CheckCircle2 size={64} className="text-emerald-400 mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Instalação Concluída com Sucesso!</h2>
              <p className="text-xs text-gray-300 max-w-md mx-auto">
                A aplicação foi configurada e seu administrador mestre foi cadastrado.
              </p>
            </div>

            {/* Ações de Conclusão */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 max-w-lg mx-auto text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-white/10 pb-2">
                Ações Recomendadas de Conclusão
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadSummary}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-2.5 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] group-hover:scale-110 transition-transform">
                    <Download size={16} />
                  </div>
                  <div className="text-left">
                    <span className="block text-white font-bold">Baixar Resumo</span>
                    <span className="block text-[10px] text-gray-400">Salvar credenciais (.txt)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSeedPopularAnimes}
                  disabled={isSeedingPopular}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-2.5 transition-all group disabled:opacity-50"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    {isSeedingPopular ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  </div>
                  <div className="text-left">
                    <span className="block text-white font-bold">Populares Top 25</span>
                    <span className="block text-[10px] text-gray-400">Importar via Jikan API</span>
                  </div>
                </button>
              </div>

              {seedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                  {seedSuccess}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-8 py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-[#FF6B00]/30 transition-all"
              >
                <span>Ir para o Painel Administrativo</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-20 text-white flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
          <p className="text-xs font-bold text-gray-400">Carregando assistente de instalação...</p>
        </div>
      }
    >
      <SetupWizardForm />
    </React.Suspense>
  );
}
