'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react';
import { FolderPlus, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { AdminFeedback, AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { useConfirmation } from '@/context/ConfirmationContext';
import type { EditorialCollection } from '@/types/public-experience';

type Feedback = {
  tone: 'success' | 'danger' | 'warning' | 'info';
  message: string;
} | null;

interface CollectionDraft {
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  active: boolean;
  publishedFrom: string;
  publishedUntil: string;
  anilistIds: string;
}

const EMPTY_DRAFT: CollectionDraft = {
  slug: '',
  title: '',
  description: '',
  coverUrl: '',
  active: true,
  publishedFrom: '',
  publishedUntil: '',
  anilistIds: '',
};

function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toDraft(collection: EditorialCollection): CollectionDraft {
  return {
    slug: collection.slug,
    title: collection.title,
    description: collection.description || '',
    coverUrl: collection.coverUrl || '',
    active: collection.active,
    publishedFrom: toDateTimeInput(collection.publishedFrom),
    publishedUntil: toDateTimeInput(collection.publishedUntil),
    anilistIds: collection.items.map((item) => String(item.anilistId)).join('\n'),
  };
}

function parseIds(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)
    .slice(0, 100);
}

async function readPayload(response: Response) {
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  return payload.data;
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="admin-field-group">
      <span className="admin-field-label">{label}</span>
      {children}
      {help && <span className="admin-field-help">{help}</span>}
    </label>
  );
}

export function EditorialCollections() {
  const { confirm } = useConfirmation();
  const [collections, setCollections] = useState<EditorialCollection[]>([]);
  const [draft, setDraft] = useState<CollectionDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/collections', {
        cache: 'no-store',
      });
      setCollections(await readPayload(response));
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível carregar as coleções.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    const body = {
      slug: draft.slug,
      title: draft.title,
      description: draft.description || null,
      coverUrl: draft.coverUrl || null,
      active: draft.active,
      publishedFrom: draft.publishedFrom || null,
      publishedUntil: draft.publishedUntil || null,
      anilistIds: parseIds(draft.anilistIds),
    };
    try {
      const response = await fetch(editingId ? `/api/admin/collections/${editingId}` : '/api/admin/collections', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await readPayload(response);
      await load();
      reset();
      setFeedback({
        tone: 'success',
        message: editingId ? 'Coleção atualizada.' : 'Coleção criada.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível salvar a coleção.',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (collection: EditorialCollection) => {
    if (saving) return;
    const accepted = await confirm({
      title: `Excluir ${collection.title}?`,
      description: 'Os itens serão removidos da coleção. Animes e dados do catálogo não serão apagados.',
      confirmText: 'Excluir coleção',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/collections/${collection.id}`, {
        method: 'DELETE',
      });
      await readPayload(response);
      if (editingId === collection.id) reset();
      await load();
      setFeedback({ tone: 'success', message: 'Coleção excluída.' });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível excluir a coleção.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      <AdminPageHeader
        eyebrow="Gerenciar / Conteúdo editorial"
        title="Coleções"
        description="Crie listas reutilizáveis para a Home, banners e experiências editoriais. A ordem dos IDs define a ordem pública."
        breadcrumbs={[{ label: 'Coleções' }]}
        actions={
          <button type="button" className="admin-button is-primary" onClick={reset}>
            <Plus size={15} /> Nova coleção
          </button>
        }
      />
      {feedback && (
        <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </AdminFeedback>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,.9fr)]">
        <AdminPanel className="overflow-hidden">
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">Biblioteca editorial</p>
              <h2 className="admin-section-title">Coleções cadastradas</h2>
              <p className="admin-section-description">Coleções inativas ou fora do período não são resolvidas na Home pública.</p>
            </div>
            <FolderPlus size={20} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          {loading ? (
            <div className="admin-empty-state min-h-64">
              <Loader2 size={22} className="animate-spin text-[var(--accent)]" aria-hidden="true" />
              <p>Carregando coleções…</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="admin-empty-state min-h-64">
              <FolderPlus size={24} className="text-[var(--admin-dim)]" aria-hidden="true" />
              <h3>Nenhuma coleção ainda</h3>
              <p>Crie uma lista manual para reutilizar em blocos da Home.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-line)]">
              {collections.map((collection) => (
                <div key={collection.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-sm text-[var(--admin-text)]">{collection.title}</strong>
                      <AdminStatusBadge status={collection.active ? 'healthy' : 'unknown'} label={collection.active ? 'Ativa' : 'Inativa'} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">
                      {collection.slug} · {collection.items.length} anime(s)
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-dim)]">{collection.description || 'Sem descrição.'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/api/collections/${collection.slug}`} target="_blank" className="admin-button is-ghost">
                      Ver JSON
                    </Link>
                    <button
                      type="button"
                      className="admin-button is-secondary"
                      onClick={() => {
                        setEditingId(collection.id);
                        setDraft(toDraft(collection));
                      }}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button type="button" className="admin-button is-danger" onClick={() => void remove(collection)} disabled={saving}>
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel className="overflow-hidden">
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">{editingId ? 'Editar coleção' : 'Nova coleção'}</p>
              <h2 className="admin-section-title">Dados editoriais</h2>
              <p className="admin-section-description">Use IDs numéricos do Kenjitsu e mantenha a lista em ordem de destaque.</p>
            </div>
            {editingId && (
              <button type="button" className="admin-button is-ghost" onClick={reset} aria-label="Cancelar edição">
                <X size={15} />
              </button>
            )}
          </div>
          <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Slug">
                <input
                  className="admin-field font-mono text-xs"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="destaques-da-semana"
                />
              </Field>
              <Field label="Título">
                <input
                  className="admin-field"
                  required
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Destaques da semana"
                />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea
                className="admin-field min-h-20 resize-y"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Capa" help="Opcional; use /asset-interno ou um host HTTPS permitido.">
              <input
                className="admin-field"
                type="text"
                value={draft.coverUrl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    coverUrl: event.target.value,
                  }))
                }
                placeholder="/icon.svg"
              />
            </Field>
            <Field label="IDs dos animes" help="Um anilistId por linha ou separado por vírgulas. Máximo de 100.">
              <textarea
                className="admin-field min-h-44 resize-y font-mono text-xs"
                required
                value={draft.anilistIds}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    anilistIds: event.target.value,
                  }))
                }
                placeholder="21\n1535\n16498"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Publicar a partir de">
                <input
                  className="admin-field"
                  type="datetime-local"
                  value={draft.publishedFrom}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      publishedFrom: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Publicar até">
                <input
                  className="admin-field"
                  type="datetime-local"
                  value={draft.publishedUntil}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      publishedUntil: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-[var(--admin-line)] bg-[var(--admin-panel-raised)] p-3">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    active: event.currentTarget.checked,
                  }))
                }
              />
              <span className="text-sm font-semibold text-[var(--admin-text)]">Coleção ativa</span>
            </label>
            <button type="submit" className="admin-button is-primary w-full justify-center" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {editingId ? 'Salvar coleção' : 'Criar coleção'}
            </button>
          </form>
        </AdminPanel>
      </div>
    </div>
  );
}
