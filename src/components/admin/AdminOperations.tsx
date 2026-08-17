'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
import { AdminEmptyState, AdminFeedback, AdminPanel } from '@/components/admin';
import { useConfirmation } from '@/context/ConfirmationContext';
import type { AdminAuditEntry } from '@/types/admin';

type Feedback = {
  tone: 'success' | 'danger' | 'warning' | 'info';
  message: string;
} | null;

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a ação.');
  return payload;
}

function OperationForm({
  eyebrow,
  title,
  description,
  onSubmit,
  feedback,
  children,
  submitLabel,
  submitting = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onSubmit: (event: FormEvent) => void;
  feedback: Feedback;
  children: ReactNode;
  submitLabel: string;
  submitting?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="admin-panel overflow-hidden">
      <div className="admin-panel-header">
        <div>
          <p className="admin-eyebrow">{eyebrow}</p>
          <h2 className="admin-section-title">{title}</h2>
          <p className="admin-section-description">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        {children}
        {feedback && <AdminFeedback tone={feedback.tone}>{feedback.message}</AdminFeedback>}
        <div className="flex justify-end">
          <button type="submit" className="admin-button is-primary" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

export function BroadcastOperation() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'INFO' | 'WARNING' | 'SUCCESS'>('INFO');
  const [placement, setPlacement] = useState<'banner' | 'home' | 'player'>('banner');
  const [priority, setPriority] = useState(0);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await post('/api/admin/broadcast', {
        title,
        content,
        type,
        placement,
        priority,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        ctaLabel: ctaLabel || null,
        ctaHref: ctaHref || null,
      });
      setTitle('');
      setContent('');
      setType('INFO');
      setPlacement('banner');
      setPriority(0);
      setStartsAt('');
      setEndsAt('');
      setCtaLabel('');
      setCtaHref('');
      setFeedback({
        tone: 'success',
        message: 'Comunicado publicado e registrado na auditoria.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Falha ao publicar o comunicado.',
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <OperationForm
      eyebrow="Comunicação"
      title="Novo comunicado"
      description="Mensagem operacional que será exibida aos usuários."
      onSubmit={submit}
      feedback={feedback}
      submitLabel="Publicar comunicado"
      submitting={submitting}
    >
      <label className="admin-field-group">
        <span className="admin-field-label">Título</span>
        <input className="admin-field" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="admin-field-group">
        <span className="admin-field-label">Mensagem</span>
        <textarea className="admin-field min-h-36 resize-y" required rows={5} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="admin-field-group">
          <span className="admin-field-label">Tipo</span>
          <select className="admin-field" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            <option value="INFO">Informação</option>
            <option value="WARNING">Atenção</option>
            <option value="SUCCESS">Sucesso</option>
          </select>
        </label>
        <label className="admin-field-group">
          <span className="admin-field-label">Local</span>
          <select className="admin-field" value={placement} onChange={(event) => setPlacement(event.target.value as typeof placement)}>
            <option value="banner">Banner global</option>
            <option value="home">Home</option>
            <option value="player">Player</option>
          </select>
        </label>
        <label className="admin-field-group">
          <span className="admin-field-label">Prioridade</span>
          <input
            className="admin-field"
            type="number"
            min={0}
            max={100}
            value={priority}
            onChange={(event) => setPriority(Math.min(100, Math.max(0, Number(event.target.value) || 0)))}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="admin-field-group">
          <span className="admin-field-label">Início</span>
          <input className="admin-field" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        </label>
        <label className="admin-field-group">
          <span className="admin-field-label">Término</span>
          <input className="admin-field" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="admin-field-group">
          <span className="admin-field-label">Texto do CTA</span>
          <input className="admin-field" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Saiba mais" />
        </label>
        <label className="admin-field-group">
          <span className="admin-field-label">Rota do CTA</span>
          <input className="admin-field font-mono text-xs" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} placeholder="/animes" />
        </label>
      </div>
    </OperationForm>
  );
}

export function SystemOperation() {
  const [enabled, setEnabled] = useState(false);
  const [messageText, setMessageText] = useState('Estamos em manutenção para atualização de servidores.');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/maintenance', { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        setEnabled(Boolean(data.maintenance));
        if (data.message) setMessageText(data.message);
      })
      .catch((error) => {
        if (error.name !== 'AbortError')
          setFeedback({
            tone: 'danger',
            message: 'Não foi possível carregar o estado atual.',
          });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const nextEnabled = !enabled;
      await post('/api/admin/maintenance', {
        enabled: nextEnabled,
        message: messageText,
      });
      setEnabled(nextEnabled);
      setFeedback({
        tone: 'success',
        message: `Modo manutenção ${nextEnabled ? 'ativado' : 'desativado'} e registrado na auditoria.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Falha ao atualizar a disponibilidade.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OperationForm
      eyebrow="Disponibilidade"
      title="Modo manutenção"
      description="Controle a mensagem pública durante uma janela operacional."
      onSubmit={submit}
      feedback={feedback}
      submitLabel={loading ? 'Carregando estado…' : enabled ? 'Desativar manutenção' : 'Ativar manutenção'}
      submitting={loading || submitting}
    >
      <label className="admin-field-group">
        <span className="admin-field-label">Mensagem pública</span>
        <textarea className="admin-field min-h-28 resize-y" rows={4} value={messageText} onChange={(event) => setMessageText(event.target.value)} />
      </label>
      <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
        <span className={`admin-status-badge ${enabled ? 'is-degraded' : 'is-healthy'}`}>
          <span className="admin-status-dot" aria-hidden="true" />
          {enabled ? 'Manutenção ativa' : 'Operação normal'}
        </span>
        <span>O próximo clique alterna o estado.</span>
      </div>
    </OperationForm>
  );
}

export function BackupOperation() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const { confirm } = useConfirmation();
  const restore = async (file?: File) => {
    if (!file || busy) return;
    const accepted = await confirm({
      title: 'Restaurar este backup?',
      description: (
        <>
          O arquivo <strong>{file.name}</strong> ({Math.ceil(file.size / 1024)} KB) será aplicado ao catálogo atual. Exporte um backup antes de continuar.
        </>
      ),
      confirmText: 'Restaurar dados',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!accepted) return;
    setBusy(true);
    setFeedback(null);
    try {
      const payload = await post('/api/admin/backup', JSON.parse(await file.text()));
      setFeedback({
        tone: 'success',
        message: payload.message || 'Backup restaurado e registrado na auditoria.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Arquivo inválido ou restauração interrompida.',
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminPanel>
      <div className="admin-panel-header">
        <div>
          <p className="admin-eyebrow">Proteção de dados</p>
          <h2 className="admin-section-title">Backup e restauração</h2>
          <p className="admin-section-description">Exporte uma cópia antes de restaurar. A restauração altera o catálogo atual.</p>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/backup" download className="admin-button is-secondary">
            <Download size={16} /> Exportar JSON
          </a>
          <label className="admin-button is-danger cursor-pointer">
            <Upload size={16} />
            {busy ? 'Restaurando…' : 'Restaurar JSON'}
            <input
              type="file"
              disabled={busy}
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void restore(file);
              }}
            />
          </label>
        </div>
        {feedback && <AdminFeedback tone={feedback.tone}>{feedback.message}</AdminFeedback>}
        <p className="text-xs leading-relaxed text-[var(--admin-dim)]">
          A operação é destrutiva e exige confirmação explícita. O arquivo não é enviado a nenhum serviço externo.
        </p>
      </div>
    </AdminPanel>
  );
}

export function IntegrationOperation() {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await post('/api/admin/webhooks', { name, url });
      setName('');
      setUrl('');
      setFeedback({
        tone: 'success',
        message: 'Webhook salvo e registrado na auditoria.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Falha ao salvar a integração.',
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <OperationForm
      eyebrow="Conectividade"
      title="Novo webhook"
      description="Integração opcional para eventos operacionais do aplicativo."
      onSubmit={submit}
      feedback={feedback}
      submitLabel="Salvar integração"
      submitting={submitting}
    >
      <label className="admin-field-group">
        <span className="admin-field-label">Nome</span>
        <input className="admin-field" required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="admin-field-group">
        <span className="admin-field-label">URL do webhook</span>
        <input className="admin-field font-mono" required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
      </label>
      <p className="text-xs leading-relaxed text-[var(--admin-dim)]">
        As fontes de catálogo e playback permanecem exclusivamente no Kenjitsu. Este formulário gerencia apenas webhooks administrativos.
      </p>
    </OperationForm>
  );
}

export function ReleaseOperation() {
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await post('/api/changelog', {
        version,
        title,
        content,
        type: 'IMPROVEMENT',
      });
      setVersion('');
      setTitle('');
      setContent('');
      setFeedback({
        tone: 'success',
        message: 'Release publicada no changelog e registrada na auditoria.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Falha ao publicar a release.',
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <OperationForm
      eyebrow="Publicação"
      title="Publicar release"
      description="Registre uma versão pública com notas claras para os usuários."
      onSubmit={submit}
      feedback={feedback}
      submitLabel="Publicar no changelog"
      submitting={submitting}
    >
      <label className="admin-field-group">
        <span className="admin-field-label">Versão</span>
        <input className="admin-field font-mono" required value={version} onChange={(event) => setVersion(event.target.value)} placeholder="2.2.0" />
      </label>
      <label className="admin-field-group">
        <span className="admin-field-label">Título</span>
        <input className="admin-field" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="admin-field-group">
        <span className="admin-field-label">Notas da versão</span>
        <textarea className="admin-field min-h-44 resize-y" required rows={8} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
    </OperationForm>
  );
}

export function AuditHistory({ resourceType }: { resourceType?: string }) {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const query = resourceType ? `&resourceType=${encodeURIComponent(resourceType)}` : '';
    fetch(`/api/admin/audit?pageSize=12${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar a auditoria.');
        setEntries(payload.entries || []);
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar a auditoria.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [resourceType]);
  return (
    <AdminPanel>
      <div className="admin-panel-header">
        <div>
          <p className="admin-eyebrow">Rastro de mudanças</p>
          <h2 className="admin-section-title">Atividade recente</h2>
          <p className="admin-section-description">Ações administrativas com metadata sanitizada.</p>
        </div>
      </div>
      {error ? (
        <div className="p-5">
          <AdminFeedback tone="danger">{error}</AdminFeedback>
        </div>
      ) : loading ? (
        <div className="flex min-h-32 items-center justify-center text-sm text-[var(--admin-muted)]">
          <Loader2 size={17} className="mr-2 animate-spin" /> Carregando atividade…
        </div>
      ) : entries.length === 0 ? (
        <AdminEmptyState title="Sem atividade registrada" description="As próximas alterações administrativas aparecerão aqui." />
      ) : (
        <div className="divide-y divide-[var(--admin-line)]">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--admin-text)]">{entry.summary}</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--admin-dim)]">
                  {entry.action} · {entry.resourceType}
                  {entry.resourceId ? `/${entry.resourceId}` : ''}
                </p>
              </div>
              <time className="text-xs text-[var(--admin-muted)]" dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString('pt-BR')}
              </time>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
