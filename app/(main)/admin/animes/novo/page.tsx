'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Loader2, Save, Sparkles } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar } from '@/components/admin';

type NewAnimeForm = {
  title: string;
  originalTitle: string;
  slug: string;
  releaseYear: number | '';
  status: string;
  posterUrl: string;
  bannerUrl: string;
  description: string;
};

const emptyForm: NewAnimeForm = {
  title: '',
  originalTitle: '',
  slug: '',
  releaseYear: new Date().getFullYear(),
  status: 'Em Lançamento',
  posterUrl: '',
  bannerUrl: '',
  description: '',
};

const statusOptions = ['Em Lançamento', 'Concluído', 'Pausado', 'Anunciado', 'Currently Airing', 'Finished Airing', 'Not yet aired'];

export default function AdminNewAnimePage() {
  const router = useRouter();
  const [form, setForm] = useState<NewAnimeForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(emptyForm), [form]);
  const update = <K extends keyof NewAnimeForm>(key: K, value: NewAnimeForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleAutofill = async () => {
    if (!form.title.trim()) {
      setError('Digite um título antes de consultar os metadados no Kenjitsu.');
      return;
    }
    setAutofilling(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/animes/autofill?title=${encodeURIComponent(form.title.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível consultar o Kenjitsu.');
      const match = payload.results?.[0];
      if (!match) throw new Error('Nenhum título correspondente foi encontrado no Kenjitsu.');
      setForm((current) => ({
        ...current,
        title: match.title || current.title,
        originalTitle: match.originalTitle || current.originalTitle,
        slug: match.slug || current.slug,
        releaseYear: match.releaseYear || current.releaseYear,
        status: match.status || current.status,
        posterUrl: match.posterUrl || current.posterUrl,
        bannerUrl: match.bannerUrl || match.posterUrl || current.bannerUrl,
        description: match.description || current.description,
      }));
      setSuccess('Metadados preenchidos pelo Kenjitsu. Revise antes de salvar.');
    } catch (autofillError) {
      setError(autofillError instanceof Error ? autofillError.message : 'Falha ao consultar o Kenjitsu.');
    } finally {
      setAutofilling(false);
    }
  };

  const createAnime = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/animes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          originalTitle: form.originalTitle || undefined,
          slug: form.slug || undefined,
          releaseYear: typeof form.releaseYear === 'number' ? form.releaseYear : undefined,
          status: form.status,
          posterUrl: form.posterUrl || undefined,
          bannerUrl: form.bannerUrl || undefined,
          description: form.description || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao cadastrar anime.');
      setSuccess('Anime cadastrado. Abrindo editor…');
      window.setTimeout(() => router.push(`/admin/animes/${payload.anime.id}/editar`), 500);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao cadastrar anime.');
    } finally {
      setLoading(false);
    }
  };

  const discard = () => {
    setForm(emptyForm);
    setError(null);
    setSuccess('Rascunho descartado.');
  };

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader
        eyebrow="Catálogo / Novo registro"
        title="Cadastrar anime"
        description="Crie o registro local e use o Kenjitsu para reduzir o trabalho de preenchimento editorial."
        breadcrumbs={[{ label: 'Animes', href: '/admin/animes' }, { label: 'Novo' }]}
        actions={(
          <button type="button" className="admin-button is-secondary" onClick={() => void handleAutofill()} disabled={autofilling || !form.title.trim()}>
            {autofilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Consultar Kenjitsu
          </button>
        )}
      />

      <div className="space-y-3" aria-live="polite">
        {error && <AdminFeedback tone="danger" onDismiss={() => setError(null)}>{error}</AdminFeedback>}
        {success && <AdminFeedback tone="success" onDismiss={() => setSuccess(null)}>{success}</AdminFeedback>}
      </div>

      <form onSubmit={(event) => void createAnime(event)} className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <AdminPanel>
          <div className="admin-panel-header"><div><p className="admin-eyebrow">Prévia</p><h2 className="admin-section-title">Capa</h2></div></div>
          <div className="relative mx-4 aspect-[2/3] overflow-hidden border border-[var(--admin-line)] bg-[var(--admin-page)] sm:mx-5">
            {form.posterUrl ? <SafeImage src={form.posterUrl} alt={`Poster de ${form.title || 'novo anime'}`} fill className="object-cover" /> : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--admin-dim)]"><ImageIcon size={28} aria-hidden="true" /><span className="text-[11px]">A prévia aparece após informar uma URL.</span></div>
            )}
          </div>
          <p className="px-4 pb-4 text-xs leading-relaxed text-[var(--admin-muted)] sm:px-5 sm:pb-5">O poster pode ser revisado depois no editor do catálogo.</p>
        </AdminPanel>

        <AdminPanel>
          <div className="admin-panel-header"><div><p className="admin-eyebrow">Registro inicial</p><h2 className="admin-section-title">Identidade e metadata</h2><p className="admin-section-description">Campos usados pelo catálogo e pelas buscas públicas.</p></div></div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">Título principal <span aria-hidden="true">*</span></span><input className="admin-field" required value={form.title} onChange={(event) => { const title = event.target.value; update('title', title); if (!form.slug || form.slug === form.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-')) update('slug', title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-')); }} placeholder="Ex.: Jujutsu Kaisen" /></label>
            <label className="admin-field-group"><span className="admin-field-label">Título original</span><input className="admin-field" value={form.originalTitle} onChange={(event) => update('originalTitle', event.target.value)} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Slug da URL</span><input className="admin-field font-mono" value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="jujutsu-kaisen" /></label>
            <label className="admin-field-group"><span className="admin-field-label">Ano de lançamento</span><input className="admin-field" type="number" min={1900} max={2200} value={form.releaseYear} onChange={(event) => update('releaseYear', event.target.value ? Number(event.target.value) : '')} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Status editorial</span><select className="admin-field" value={form.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">URL do poster</span><input className="admin-field" type="url" value={form.posterUrl} onChange={(event) => update('posterUrl', event.target.value)} placeholder="https://…" /></label>
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">URL do backdrop</span><input className="admin-field" type="url" value={form.bannerUrl} onChange={(event) => update('bannerUrl', event.target.value)} placeholder="https://…" /></label>
            <label className="admin-field-group sm:col-span-2"><span className="admin-field-label">Sinopse</span><textarea className="admin-field min-h-36 resize-y" rows={6} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
            <div className="flex justify-end sm:col-span-2"><button type="submit" className="admin-button is-primary" disabled={loading || !form.title.trim()}>{loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar anime</button></div>
          </div>
        </AdminPanel>
      </form>

      <AdminSaveBar dirty={dirty} saving={loading} onSave={() => void createAnime()} onDiscard={discard} label="Há um novo registro preenchido sem salvar" />
    </div>
  );
}
