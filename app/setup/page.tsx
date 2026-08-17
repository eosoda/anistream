'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

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

  if (score <= 1) return { label: 'Fraca (mín. 6 caracteres)', color: 'bg-red-500', text: 'text-red-400', percentage: 20 };
  if (score === 2) return { label: 'Razoável', color: 'bg-amber-500', text: 'text-amber-400', percentage: 40 };
  if (score === 3) return { label: 'Boa', color: 'bg-yellow-400', text: 'text-yellow-400', percentage: 65 };
  if (score === 4) return { label: 'Forte', color: 'bg-[#FF6B00]', text: 'text-[#FF6B00]', percentage: 85 };
  return { label: 'Excelente', color: 'bg-emerald-500', text: 'text-emerald-400', percentage: 100 };
}

function SetupWizardForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupKey, setSetupKey] = useState('');
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSeedingPopular, setIsSeedingPopular] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setTestingDb(true);
    try {
      const response = await fetch('/api/setup/status', {
        headers: setupKey ? { 'x-setup-key': setupKey } : undefined,
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.isInitialized) {
        router.replace('/admin/login');
        return;
      }

      setDbConnected(Boolean(data.dbConnected));
      if (setupKey) setKeyValid(data.keyValid);
    } catch {
      setDbConnected(false);
    } finally {
      setTestingDb(false);
      setCheckingStatus(false);
    }
  }, [router, setupKey]);

  useEffect(() => {
    // The initial request synchronizes this client view with the setup API.
    void checkStatus();
  }, [checkStatus]);

  const handleCompleteSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-setup-key': setupKey },
        body: JSON.stringify({
          admin: {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na inicialização da aplicação');

      setCurrentStep(4);
      window.setTimeout(() => router.push('/admin'), 2000);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Falha na inicialização da aplicação');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const summary = `===================================================================
AniStream - Resumo da Instalação do Sistema
Data de Instalação: ${new Date().toLocaleString('pt-BR')}
===================================================================

[CONFIGURAÇÕES DO ADMINISTRADOR MESTRE]
Nome               : ${adminName || 'Administrador Principal'}
E-mail             : ${adminEmail}
Status da Conta    : Ativa (Super Admin)

[CONFIGURAÇÕES DO SISTEMA]
URL da Aplicação   : ${origin}
Painel Admin       : ${origin}/admin/login
Catálogo e mídia   : API Kenjitsu self-hosted

[IMPORTANTE]
- Guarde este arquivo em local seguro.
- Ative ou desative extensões no painel "Extensões Kenjitsu".
===================================================================
`;

    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anistream-resumo-instalacao-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSeedPopularAnimes = async () => {
    setIsSeedingPopular(true);
    setSeedSuccess(null);
    try {
      const response = await fetch('/api/setup/seed-popular', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao popular catálogo');
      setSeedSuccess(`Sucesso! ${data.seededCount || 25} animes populares foram adicionados ao catálogo.`);
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : 'Falha ao popular catálogo');
    } finally {
      setIsSeedingPopular(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-white">
        <Loader2 size={36} className="animate-spin text-[#FF6B00]" />
        <p className="text-xs font-bold text-gray-400">Verificando status do sistema...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center py-4 sm:py-6">
      <div className="glass-panel relative w-full max-w-2xl space-y-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-2xl bg-[#FF6B00]/20 p-3 text-[#FF6B00]">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-black text-white">Assistente de Instalação Inicial</h1>
          <p className="text-xs text-gray-400">
            Configure o banco de dados, a chave de segurança e a conta mestre em poucas etapas.
          </p>
          <div className="grid grid-cols-4 gap-2 pt-2" role="group" aria-label="Progresso da instalação">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-500 ${currentStep >= step ? 'bg-[#FF6B00]' : 'bg-white/10'}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs font-bold text-red-400">
            {error}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="setup-key" className="block text-xs font-bold text-gray-300">
                Chave de Instalação (Setup Key)
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-3 text-[#FF6B00]" />
                <input
                  id="setup-key"
                  type="text"
                  placeholder="Ex: setup_a8f94b2c9e1d3f5a"
                  value={setupKey}
                  onChange={(event) => {
                    setSetupKey(event.target.value);
                    setKeyValid(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-gray-500 focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
              <p className={`text-[10px] ${keyValid === false ? 'text-red-400' : 'text-gray-400'}`}>
                Use o valor de <code>INITIAL_SETUP_KEY</code> configurado no ambiente do serviço para continuar.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={24} className="text-[#FF6B00]" />
                  <div>
                    <h2 className="text-sm font-bold text-white">Conexão PostgreSQL</h2>
                    <p className="text-xs text-gray-400">
                      {dbConnected ? 'Conectado e pronto para a instalação.' : 'Falha ao conectar. Verifique DATABASE_URL.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void checkStatus()}
                    disabled={testingDb}
                    aria-label="Testar conexão com o banco"
                    className="rounded-xl border border-white/10 bg-white/10 p-2 text-white hover:bg-white/20"
                  >
                    <RefreshCcw size={16} className={testingDb ? 'animate-spin' : ''} />
                  </button>
                  {dbConnected ? <CheckCircle2 size={24} className="text-emerald-400" /> : <AlertTriangle size={24} className="text-red-400" />}
                </div>
              </div>

            </div>

            <button
              type="button"
              disabled={!dbConnected || !setupKey.trim()}
              onClick={() => setCurrentStep(2)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-3.5 text-xs font-black text-white transition-all hover:bg-[#FF6B00]/80 disabled:opacity-50"
            >
              <span>Avançar para Conta do Administrador</span><ArrowRight size={16} />
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="setup-admin-name" className="mb-1 block text-xs font-bold text-gray-300">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-gray-400" />
                <input id="setup-admin-name" type="text" placeholder="Ex: Administrador Principal" value={adminName} onChange={(event) => setAdminName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:border-[#FF6B00] focus:outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="setup-admin-email" className="mb-1 block text-xs font-bold text-gray-300">E-mail do Administrador</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input id="setup-admin-email" type="email" placeholder="admin@anistream.com" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:border-[#FF6B00] focus:outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="setup-admin-password" className="mb-1 block text-xs font-bold text-gray-300">Senha (mínimo 12 caracteres)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input id="setup-admin-password" type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha de acesso" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:border-[#FF6B00] focus:outline-none" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'} className="absolute right-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]"><span className="text-gray-400">Força da senha:</span><span className={`font-bold ${getPasswordStrength(adminPassword).text}`}>{getPasswordStrength(adminPassword).label}</span></div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className={`h-full transition-all ${getPasswordStrength(adminPassword).color}`} style={{ width: `${getPasswordStrength(adminPassword).percentage}%` }} /></div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="setup-admin-password-confirmation" className="mb-1 block text-xs font-bold text-gray-300">Repetir Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input id="setup-admin-password-confirmation" type={showConfirmPassword ? 'text' : 'password'} placeholder="Digite a mesma senha novamente" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`w-full rounded-xl border bg-black/50 py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none ${confirmPassword && confirmPassword !== adminPassword ? 'border-red-500/60' : confirmPassword ? 'border-emerald-500/60' : 'border-white/10'}`} />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Exibir confirmação'} className="absolute right-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && <p className={`mt-1 text-[11px] font-semibold ${confirmPassword === adminPassword ? 'text-emerald-400' : 'text-red-400'}`}>{confirmPassword === adminPassword ? 'As senhas coincidem' : 'As senhas não coincidem'}</p>}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(1)} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20"><ArrowLeft size={16} />Voltar</button>
              <button type="button" disabled={!adminName.trim() || !adminEmail.trim() || adminPassword.length < 12 || confirmPassword !== adminPassword} onClick={() => setCurrentStep(3)} className="flex items-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B00]/80 disabled:opacity-50"><span>Avançar para Integração Kenjitsu</span><ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-start gap-3">
                <Sparkles size={22} className="mt-0.5 text-[#FF6B00]" />
                <div>
                  <h2 className="text-sm font-bold text-white">Catálogo e fontes Kenjitsu</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    O catálogo, os episódios e as fontes serão consultados exclusivamente pela API Kenjitsu self-hosted.
                    As extensões podem ser ativadas, desativadas e testadas em <code>/admin/extensions</code>.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              <CheckCircle2 size={18} />
              <span>Não é necessário cadastrar hosts, importar playlists ou inserir URLs manuais.</span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(2)} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20"><ArrowLeft size={16} />Voltar</button>
              <button type="button" disabled={loading} onClick={() => void handleCompleteSetup()} className="flex items-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B00]/80 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Concluir Instalação
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 py-6 text-center">
            <CheckCircle2 size={64} className="mx-auto text-emerald-400" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Instalação concluída com sucesso!</h2>
              <p className="mx-auto max-w-md text-xs text-gray-300">O administrador mestre foi cadastrado e o app está pronto para usar o Kenjitsu self-hosted.</p>
            </div>
            <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-white/10 bg-black/40 p-5 text-left">
              <h3 className="border-b border-white/10 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Ações recomendadas</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleDownloadSummary} className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs font-bold text-white hover:bg-white/10">
                  <div className="rounded-lg bg-[#FF6B00]/20 p-2 text-[#FF6B00]"><Download size={16} /></div>
                  <div><span className="block">Baixar resumo</span><span className="block text-[10px] text-gray-400">Salvar dados da instalação</span></div>
                </button>
                <button type="button" onClick={() => void handleSeedPopularAnimes()} disabled={isSeedingPopular} className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50">
                  <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">{isSeedingPopular ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}</div>
                  <div><span className="block">Populares Top 25</span><span className="block text-[10px] text-gray-400">Importar via catálogo Kenjitsu</span></div>
                </button>
              </div>
              {seedSuccess && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs font-bold text-emerald-400">{seedSuccess}</div>}
            </div>
            <button type="button" onClick={() => router.push('/admin')} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-8 py-3.5 text-xs font-black text-white shadow-lg shadow-[#FF6B00]/30 hover:bg-[#FF6B00]/80"><span>Ir para o painel admin</span><ArrowRight size={16} /></button>
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
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-white">
          <Loader2 size={36} className="animate-spin text-[#FF6B00]" />
          <p className="text-xs font-bold text-gray-400">Carregando assistente de instalação...</p>
        </div>
      }
    >
      <SetupWizardForm />
    </React.Suspense>
  );
}
