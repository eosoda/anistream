'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, FlaskConical, Loader2, Power, ShieldOff, XCircle } from 'lucide-react';

interface ExtensionItem {
  id: string;
  enabled: boolean;
  nsfw: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'healthy' | 'degraded' | 'down' | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
  manifest?: { name?: string; version?: string; source?: string; capabilities?: string[]; upstream?: { module?: string; repository?: string } } | null;
}

export default function AdminExtensionsPage() {
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/extensions', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao carregar extensões.');
      setExtensions(payload.extensions || []);
      setMessage(payload.kenjitsuError || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar extensões.');
    } finally {
      setLoading(false);
    }
  };

  // The initial fetch synchronizes this client view with the admin API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const patch = async (id: string, change: { enabled?: boolean; nsfw?: boolean }) => {
    setBusyId(id);
    try {
      const response = await fetch('/api/admin/extensions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...change }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar extensão.');
      setExtensions(payload.extensions || []);
      setMessage('Configuração aplicada imediatamente às próximas consultas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar extensão.');
    } finally {
      setBusyId(null);
    }
  };

  const test = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch('/api/admin/extensions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const payload = await response.json();
      setMessage(payload.error || `${id}: ${payload.status || 'down'} (${payload.latencyMs || 0}ms)`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha no teste.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-8 bg-[#0B0B0F] p-6 text-white sm:p-10">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#FF6B00]/20 p-3 text-[#FF6B00]"><Activity size={28} /></div>
          <div>
            <h1 className="text-2xl font-black">Extensões do Kenjitsu</h1>
            <p className="mt-1 text-sm text-gray-400">Fontes nativas e portadas gerenciadas pelo fork self-hosted. Alterações valem sem reiniciar o Kenjitsu.</p>
          </div>
        </div>
      </header>

      {message && <p role="status" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">{message}</p>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#FF6B00]" /></div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {extensions.map((extension) => {
            const status = extension.lastTestStatus || 'down';
            const testing = busyId === extension.id;
            return (
              <article key={extension.id} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">{extension.manifest?.name || extension.id}</h2>
                    <p className="font-mono text-xs text-gray-500">{extension.id} · {extension.manifest?.version || 'versão não informada'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status === 'healthy' ? 'bg-emerald-500/20 text-emerald-300' : status === 'degraded' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>{status}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                  <span className="rounded-lg bg-black/30 px-2 py-1">{extension.manifest?.source || 'builtin'}</span>
                  <span className="rounded-lg bg-black/30 px-2 py-1">{extension.manifest?.capabilities?.join(' · ') || 'search · info · sources'}</span>
                  {extension.manifest?.upstream?.module && <span className="rounded-lg bg-black/30 px-2 py-1">{extension.manifest.upstream.module}</span>}
                  {extension.lastLatencyMs != null && <span className="rounded-lg bg-black/30 px-2 py-1">{extension.lastLatencyMs}ms</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void patch(extension.id, { enabled: !extension.enabled })} disabled={testing} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${extension.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}><Power size={14} /> {extension.enabled ? 'Ativa' : 'Desativada'}</button>
                  <button onClick={() => void patch(extension.id, { nsfw: !extension.nsfw })} disabled={testing} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${extension.nsfw ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-gray-400'}`}><ShieldOff size={14} /> {extension.nsfw ? 'NSFW bloqueado' : 'NSFW permitido'}</button>
                  <button onClick={() => void test(extension.id)} disabled={testing} className="inline-flex items-center gap-2 rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-2 text-xs font-bold text-[#FF6B00]">{testing ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />} Testar</button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  {status === 'healthy' ? <CheckCircle2 size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-rose-400" />}
                  {extension.lastTestedAt ? `Último teste: ${new Date(extension.lastTestedAt).toLocaleString('pt-BR')}` : 'Ainda não testada'}
                  {extension.lastError && <span className="truncate text-rose-300">· {extension.lastError}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
