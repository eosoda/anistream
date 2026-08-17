'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Database, Loader2, RefreshCw, Trash2, Zap } from 'lucide-react';
import { AdminFeedback, AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminPrimitives';

interface CacheSettings {
  enabled: boolean;
  metadataTtlSeconds: number;
  sourceTtlSeconds: number;
  audioModes: Array<'sub' | 'dub'>;
  extensionIds: string[];
  concurrency: number;
  episodesPerAnime: number;
  homeSections: string[];
  preCacheNextEpisode: boolean;
  refreshIntervalMinutes: number;
}

interface CachePayload {
  settings: CacheSettings;
  redis: { healthy: boolean };
  metrics: {
    hits: number;
    misses: number;
    warmedItems: number;
    failures: number;
    byStatus: Record<string, number>;
    tasks: Array<{ id: string; scope: string; status: string; total: number; completed: number; failed: number; createdAt: string }>;
  };
}

const labels: Record<string, string> = { hero: 'Hero', trending: 'Em alta', airing: 'Temporada atual', popular: 'Mais populares' };
const approvedExtensions = ['anikoto', 'anidb', 'anibd', 'animeheaven', 'animefire', 'animeplay', 'animesdrive', 'animesonlinecc', 'animesonlinecloud', 'anitube', 'dattebayobr', 'goyabu'];

export default function PlaybackCacheAdminPage() {
  const [payload, setPayload] = useState<CachePayload | null>(null);
  const [settings, setSettings] = useState<CacheSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger' | 'info'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cache', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar o cache.');
      setPayload(data);
      setSettings(data.settings);
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao carregar o cache.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/cache', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao salvar configurações.');
      setSettings(data.settings);
      setFeedback({ tone: 'success', message: 'Configurações de cache salvas e versão invalidada.' });
      void load();
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao salvar configurações.' });
    } finally { setSaving(false); }
  };

  const warm = async (scope: 'home' | 'catalog') => {
    setWorking(scope);
    try {
      const response = await fetch('/api/admin/cache/warm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao criar aquecimento.');
      setFeedback({ tone: 'success', message: `Tarefa criada com ${data.task.total} episódios. O worker privado processará a fila.` });
      void load();
    } catch (error) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao aquecer cache.' }); }
    finally { setWorking(''); }
  };

  const invalidate = async () => {
    setWorking('invalidate');
    try {
      const response = await fetch('/api/admin/cache/invalidate', { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao invalidar o cache.');
      setFeedback({ tone: 'success', message: 'Cache invalidado. Novas respostas receberão tokens renovados.' });
      void load();
    } catch (error) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao invalidar cache.' }); }
    finally { setWorking(''); }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operar / Performance"
        title="Cache de reprodução"
        description="Aqueça fontes do Kenjitsu sem persistir URLs temporárias no PostgreSQL. O Redis guarda as fontes por até 240 segundos; o banco registra apenas estado e métricas."
        breadcrumbs={[{ label: 'Cache de reprodução' }]}
        status={<AdminStatusBadge status={payload?.redis.healthy ? 'healthy' : 'down'} label={payload?.redis.healthy ? 'Redis conectado' : 'Redis indisponível'} />}
        actions={<button type="button" className="admin-button is-ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar</button>}
      />

      {feedback && <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</AdminFeedback>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Hits', payload?.metrics.hits ?? 0, 'text-emerald-300'],
          ['Misses', payload?.metrics.misses ?? 0, 'text-amber-300'],
          ['Itens aquecidos', payload?.metrics.warmedItems ?? 0, 'text-sky-300'],
          ['Falhas', payload?.metrics.failures ?? 0, 'text-rose-300'],
        ].map(([label, value, tone]) => <div key={String(label)} className="admin-panel p-4"><p className="text-xs font-bold uppercase tracking-wider text-[var(--admin-dim)]">{label}</p><strong className={`mt-2 block text-2xl font-black ${tone}`}>{String(value)}</strong></div>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <AdminPanel className="p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-line)] pb-4"><div><p className="admin-eyebrow">Política</p><h2 className="admin-section-title mt-1">Configuração do aquecimento</h2></div><Zap size={20} className="text-[var(--accent)]" /></div>
          {settings && <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">Cache habilitado</span><span className="flex min-h-11 items-center gap-3 text-sm text-[var(--admin-muted)]"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /> Usar Redis para fontes temporárias</span></label>
            <label className="admin-field-group"><span className="admin-field-label">TTL de fontes (máx. 240s)</span><input className="admin-field" type="number" min={15} max={240} value={settings.sourceTtlSeconds} onChange={(event) => setSettings({ ...settings, sourceTtlSeconds: Number(event.target.value) })} /></label>
            <label className="admin-field-group"><span className="admin-field-label">TTL de metadados</span><input className="admin-field" type="number" min={30} max={86400} value={settings.metadataTtlSeconds} onChange={(event) => setSettings({ ...settings, metadataTtlSeconds: Number(event.target.value) })} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Concorrência</span><input className="admin-field" type="number" min={1} max={8} value={settings.concurrency} onChange={(event) => setSettings({ ...settings, concurrency: Number(event.target.value) })} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Episódios por anime</span><input className="admin-field" type="number" min={1} max={24} value={settings.episodesPerAnime} onChange={(event) => setSettings({ ...settings, episodesPerAnime: Number(event.target.value) })} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Atualização automática (minutos)</span><input className="admin-field" type="number" min={5} max={1440} value={settings.refreshIntervalMinutes} onChange={(event) => setSettings({ ...settings, refreshIntervalMinutes: Number(event.target.value) })} /></label>
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">Blocos da Home</span><span className="flex flex-wrap gap-2">{Object.entries(labels).map(([id, label]) => <label key={id} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-muted)]"><input type="checkbox" checked={settings.homeSections.includes(id)} onChange={(event) => setSettings({ ...settings, homeSections: event.target.checked ? [...settings.homeSections, id] : settings.homeSections.filter((item) => item !== id) })} /> {label}</label>)}</span></label>
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">Áudio e extensões participantes</span><span className="flex flex-wrap gap-2">{(['sub', 'dub'] as const).map((mode) => <label key={mode} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-muted)]"><input type="checkbox" checked={settings.audioModes.includes(mode)} onChange={(event) => setSettings({ ...settings, audioModes: event.target.checked ? [...settings.audioModes, mode] : settings.audioModes.filter((item) => item !== mode) })} /> {mode === 'sub' ? 'Legendado' : 'Dublado'}</label>)}{approvedExtensions.map((extension) => <label key={extension} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-muted)]"><input type="checkbox" checked={settings.extensionIds.includes(extension)} onChange={(event) => setSettings({ ...settings, extensionIds: event.target.checked ? [...settings.extensionIds, extension] : settings.extensionIds.filter((item) => item !== extension) })} /> {extension}</label>)}</span></label>
            <label className="admin-field-group sm:col-span-2"><span className="flex min-h-11 items-center gap-3 text-sm text-[var(--admin-muted)]"><input type="checkbox" checked={settings.preCacheNextEpisode} onChange={(event) => setSettings({ ...settings, preCacheNextEpisode: event.target.checked })} /> Aquecer o próximo episódio (desativado por padrão)</span></label>
          </div>}
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--admin-line)] pt-4"><button type="button" className="admin-button is-danger" onClick={() => void invalidate()} disabled={Boolean(working)}><Trash2 size={15} /> Invalidar cache</button><button type="button" className="admin-button is-primary" onClick={() => void save()} disabled={saving || !settings}>{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Salvar política</button></div>
        </AdminPanel>

        <AdminPanel className="p-5"><div className="flex items-start justify-between gap-3 border-b border-[var(--admin-line)] pb-4"><div><p className="admin-eyebrow">Ações</p><h2 className="admin-section-title mt-1">Aquecer conteúdo</h2></div><Database size={20} className="text-[var(--accent)]" /></div><p className="mt-4 text-sm leading-6 text-[var(--admin-muted)]">As ações criam tarefas na fila. Execute o endpoint interno do worker pelo cron privado do Dokploy ou do host.</p><div className="mt-5 grid gap-2"><button type="button" className="admin-button is-secondary justify-start" onClick={() => void warm('home')} disabled={Boolean(working)}>{working === 'home' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Aquecer Home selecionada</button><button type="button" className="admin-button is-secondary justify-start" onClick={() => void warm('catalog')} disabled={Boolean(working)}>{working === 'catalog' ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />} Aquecer catálogo recente</button></div></AdminPanel>
      </div>

      <AdminPanel><div className="admin-panel-header"><div><p className="admin-eyebrow">Fila Redis / PostgreSQL</p><h2 className="admin-section-title mt-1">Histórico de tarefas</h2></div></div><div className="overflow-x-auto"><table className="admin-table min-w-full"><thead><tr><th>Tarefa</th><th>Escopo</th><th>Status</th><th>Progresso</th></tr></thead><tbody>{payload?.metrics.tasks?.map((task) => <tr key={task.id}><td className="font-mono text-xs">{task.id.slice(0, 10)}…</td><td>{task.scope}</td><td>{task.status}</td><td>{task.completed}/{task.total} concluídos · {task.failed} falhas</td></tr>) || <tr><td colSpan={4} className="p-6 text-center text-[var(--admin-muted)]">Nenhuma tarefa registrada.</td></tr>}</tbody></table></div></AdminPanel>
    </div>
  );
}
