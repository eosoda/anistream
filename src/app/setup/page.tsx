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
} from 'lucide-react';

export default function SetupWizardPage() {
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

  const [adminName, setAdminName] = useState('Administrador Principal');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [mediaHosts, setMediaHosts] = useState(
    'media.mydomain.com, cdn.mydomain.com, s3.amazonaws.com'
  );
  const [m3uContent, setM3uContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [providerName, setProviderName] = useState('authorized-m3u-main');

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
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Verificando status do sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex items-center justify-center p-4 sm:p-8">
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
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Senha (Mínimo 6 caracteres)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                />
              </div>
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
                disabled={!adminEmail || adminPassword.length < 6}
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
                  value={mediaHosts}
                  onChange={(e) => setMediaHosts(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
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

        {/* Passo 4: Importação M3U Inicial com Upload de Arquivo */}
        {currentStep === 4 && (
          <div className="space-y-4">
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
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Ou Cole o Conteúdo da Playlist M3U Autorizada
              </label>
              <textarea
                rows={5}
                value={m3uContent}
                onChange={(e) => setM3uContent(e.target.value)}
                placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;https://cdn.exemplo.com/poster.jpg&quot;,Anime Exemplo S01E01&#10;https://media.exemplo.com/s01e01/master.m3u8"
                className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-gray-200"
              />
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
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 size={64} className="text-emerald-400 mx-auto animate-bounce" />
            <h2 className="text-2xl font-black text-white">Instalação Concluída com Sucesso!</h2>
            <p className="text-xs text-gray-300 max-w-md mx-auto">
              A aplicação foi configurada e seu administrador mestre foi cadastrado. Redirecionando para o painel...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
