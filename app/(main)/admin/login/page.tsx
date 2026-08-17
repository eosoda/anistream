'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirecionar para /setup se a aplicação ainda não foi instalada
  React.useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        // Only redirect when the setup endpoint positively confirms that the
        // database is reachable and still uninitialized. A transient database
        // failure must not replace the login form with the setup wizard.
        if (data.dbConnected === true && data.isInitialized === false) {
          router.replace('/setup');
        }
      } catch {
        // Ignorar se falhar a verificação
      }
    }
    checkSetup();
  }, [router]);

  // Processar Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no login');
      }

      setSuccess('Login efetuado com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 glass-panel shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow de Fundo */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FF6B00]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00] mb-2">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-white">
            Painel Administrativo
          </h1>
          <p className="text-xs text-gray-400">
            Entre com suas credenciais de administrador
          </p>
        </div>

        {/* Mensagens de Alerta */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
            {success}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-bold text-gray-300 mb-1">
              E-mail Administrativo
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                id="admin-email"
                type="email"
                required
                placeholder="admin@anistream.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold text-gray-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                id="admin-password"
              type="password"
              required
              minLength={12}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-black font-black text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/10">
          <Link href="/setup" className="text-xs font-bold text-gray-400 hover:text-[#FF6B00] transition-colors">
            Primeira instalação? Abrir o assistente seguro
          </Link>
        </div>
      </div>
    </div>
  );
}
