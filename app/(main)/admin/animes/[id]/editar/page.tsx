'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Tv,
} from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { EpisodeSourcesModal } from '@/components/admin/EpisodeSourcesModal';
import { OpeningImportModal } from '@/components/admin/OpeningImportModal';
import {
  AdminDrawer,
  AdminEmptyState,
  AdminFeedback,
  AdminPageHeader,
  AdminPanel,
  AdminSaveBar,
} from '@/components/admin';
import { formatOpeningTime, parseOpeningTime } from '@/lib/openings/time';
import { useConfirmation } from '@/context/ConfirmationContext';

type EpisodeRecord = {
  id: string;
  season: number;
  number: number;
  title?: string | null;
  openingStartSeconds?: number | null;
  openingEndSeconds?: number | null;
  sources?: Array<{ id: string }>;
};

type AnimeForm = {
  title: string;
  originalTitle: string;
  slug: string;
  releaseYear: number | '';
  status: string;
  posterUrl: string;
  description: string;
  openingStart: string;
  openingEnd: string;
};

const defaultForm: AnimeForm = {
  title: '',
  originalTitle: '',
  slug: '',
  releaseYear: '',
  status: 'Em Lançamento',
  posterUrl: '',
  description: '',
  openingStart: '',
  openingEnd: '',
};

const statusOptions = ['Em Lançamento', 'Concluído', 'Pausado', 'Anunciado', 'Currently Airing', 'Finished Airing', 'Not yet aired'];

export default function AdminEditAnimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { confirm } = useConfirmation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingEpisode, setAddingEpisode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState<AnimeForm>(defaultForm);
  const [initialForm, setInitialForm] = useState<AnimeForm | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([]);
  const [episodeSeason, setEpisodeSeason] = useState(1);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [openingEpisode, setOpeningEpisode] = useState<EpisodeRecord | null>(null);
  const [episodeOpeningStart, setEpisodeOpeningStart] = useState('');
  const [episodeOpeningEnd, setEpisodeOpeningEnd] = useState('');
  const [savingEpisodeOpening, setSavingEpisodeOpening] = useState(false);
  const [isOpeningImportOpen, setIsOpeningImportOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<{
    episodeId: string;
    episodeNumber: number;
    seasonNumber: number;
    episodeTitle?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = useMemo(() => Boolean(initialForm && JSON.stringify(initialForm) !== JSON.stringify(form)), [form, initialForm]);

  const updateForm = <K extends keyof AnimeForm>(key: K, value: AnimeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadAnime = async (preserveForm = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/animes/${id}`);
      const payload = await response.json();
      if (!response.ok || !payload.anime) throw new Error(payload.error || 'Anime não encontrado.');

      const anime = payload.anime;
      const nextForm: AnimeForm = {
        title: anime.title || '',
        originalTitle: anime.originalTitle || '',
        slug: anime.slug || '',
        releaseYear: anime.releaseYear || '',
        status: anime.status || 'Em Lançamento',
        posterUrl: anime.posterUrl || '',
        description: anime.description || '',
        openingStart: formatOpeningTime(anime.openingStartSeconds),
        openingEnd: formatOpeningTime(anime.openingEndSeconds),
      };

      setEpisodes((anime.episodes || []) as EpisodeRecord[]);
      if (!preserveForm) {
        setForm(nextForm);
        setInitialForm(nextForm);
      }
      setEpisodeNumber((anime.episodes?.length || 0) + 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o anime.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // A página sincroniza o formulário com o registro solicitado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAnime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveAnime = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const openingStartSeconds = form.openingStart.trim() ? parseOpeningTime(form.openingStart) : null;
      const openingEndSeconds = form.openingEnd.trim() ? parseOpeningTime(form.openingEnd) : null;
      if ((openingStartSeconds == null) !== (openingEndSeconds == null) || (openingStartSeconds != null && openingEndSeconds != null && openingEndSeconds <= openingStartSeconds)) {
        throw new Error('Informe início e fim válidos para a abertura padrão.');
      }

      const response = await fetch(`/api/admin/animes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          originalTitle: form.originalTitle,
          slug: form.slug,
          releaseYear: typeof form.releaseYear === 'number' ? form.releaseYear : undefined,
          status: form.status,
          posterUrl: form.posterUrl,
          description: form.description,
          openingStartSeconds,
          openingEndSeconds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar o anime.');

      setInitialForm({ ...form });
      setSuccess('Alterações do anime salvas.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar o anime.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    void saveAnime();
  };

  const discardChanges = () => {
    if (initialForm) setForm({ ...initialForm });
    setError(null);
    setSuccess('Alterações locais descartadas.');
  };

  const openEpisodeOpening = (episode: EpisodeRecord) => {
    setOpeningEpisode(episode);
    setEpisodeOpeningStart(formatOpeningTime(episode.openingStartSeconds));
    setEpisodeOpeningEnd(formatOpeningTime(episode.openingEndSeconds));
  };

  const saveEpisodeOpening = async () => {
    if (!openingEpisode) return;
    const openingStartSeconds = episodeOpeningStart.trim() ? parseOpeningTime(episodeOpeningStart) : null;
    const openingEndSeconds = episodeOpeningEnd.trim() ? parseOpeningTime(episodeOpeningEnd) : null;
    if ((openingStartSeconds == null) !== (openingEndSeconds == null) || (openingStartSeconds != null && openingEndSeconds != null && openingEndSeconds <= openingStartSeconds)) {
      setError('Informe início e fim válidos para a abertura do episódio.');
      return;
    }

    setSavingEpisodeOpening(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/animes/${id}/episodes/${openingEpisode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingStartSeconds, openingEndSeconds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar a abertura do episódio.');
      setOpeningEpisode(null);
      setSuccess(openingStartSeconds == null ? `Episódio ${openingEpisode.number} voltou a herdar a abertura do anime.` : `Abertura do episódio ${openingEpisode.number} atualizada.`);
      await loadAnime(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar a abertura do episódio.');
    } finally {
      setSavingEpisodeOpening(false);
    }
  };

  const addEpisode = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddingEpisode(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/animes/${id}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: episodeSeason, number: episodeNumber, title: episodeTitle || `Episódio ${episodeNumber}` }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao adicionar episódio.');
      setEpisodeTitle('');
      setSuccess(`Episódio ${episodeNumber} adicionado.`);
      await loadAnime(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Falha ao adicionar episódio.');
    } finally {
      setAddingEpisode(false);
    }
  };

  const deleteEpisode = async (episodeId: string, number: number) => {
    const accepted = await confirm({
      title: `Excluir episódio ${number}?`,
      description: 'As mídias e registros associados também serão removidos. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir episódio',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!accepted) return;

    setError(null);
    try {
      const response = await fetch(`/api/admin/animes/${id}/episodes/${episodeId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao excluir episódio.');
      setSuccess(`Episódio ${number} excluído.`);
      await loadAnime(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir episódio.');
    }
  };

  const syncFromKenjitsu = async () => {
    if (dirty) {
      setError('Salve as alterações do anime antes de sincronizar episódios pelo Kenjitsu.');
      return;
    }
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/animes/${id}/sync`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Falha ao sincronizar episódios pelo Kenjitsu.');
      setSuccess(payload.message || 'Episódios sincronizados pelo Kenjitsu.');
      await loadAnime();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Falha ao sincronizar episódios.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !initialForm) {
    return (
      <div className="admin-empty-state min-h-[420px]" aria-live="polite">
        <Loader2 size={24} className="animate-spin text-[#FF6B00]" aria-hidden="true" />
        <h2>Carregando registro</h2>
        <p>Consultando catálogo e episódios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader
        eyebrow="Catálogo / Edição"
        title={form.title || 'Editar anime'}
        description="Revise a identidade editorial e mantenha os episódios prontos para as extensões Kenjitsu."
        breadcrumbs={[{ label: 'Animes', href: '/admin/animes' }, { label: form.title || 'Editar' }]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/animes" className="admin-button is-ghost">Voltar ao catálogo</Link>
            <button type="button" className="admin-button is-secondary" onClick={() => void syncFromKenjitsu()} disabled={syncing || loading}>
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar Kenjitsu
            </button>
          </div>
        )}
      />

      <div className="space-y-3" aria-live="polite">
        {error && <AdminFeedback tone="danger" onDismiss={() => setError(null)}>{error}</AdminFeedback>}
        {success && <AdminFeedback tone="success" onDismiss={() => setSuccess(null)}>{success}</AdminFeedback>}
      </div>

      <form onSubmit={handleUpdate} className="space-y-5">
        <AdminPanel>
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">01 / Identidade</p>
              <h2 className="admin-section-title">Como o anime aparece no catálogo</h2>
              <p className="admin-section-description">Campos editoriais estáveis, usados na navegação e nas buscas.</p>
            </div>
            <span className="font-mono text-[11px] text-[var(--admin-dim)]">ID {id}</span>
          </div>
          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_180px] sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-field-group sm:col-span-2">
                <span className="admin-field-label">Título principal <span aria-hidden="true">*</span></span>
                <input className="admin-field" required value={form.title} onChange={(event) => updateForm('title', event.target.value)} aria-describedby="anime-title-help" />
                <small id="anime-title-help" className="admin-field-help">Nome exibido em cards, busca e páginas públicas.</small>
              </label>
              <label className="admin-field-group">
                <span className="admin-field-label">Título original</span>
                <input className="admin-field" value={form.originalTitle} onChange={(event) => updateForm('originalTitle', event.target.value)} />
              </label>
              <label className="admin-field-group">
                <span className="admin-field-label">Slug</span>
                <input className="admin-field font-mono" required value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} aria-describedby="anime-slug-help" />
                <small id="anime-slug-help" className="admin-field-help">Identificador estável da URL.</small>
              </label>
              <label className="admin-field-group">
                <span className="admin-field-label">Ano de lançamento</span>
                <input className="admin-field" type="number" min={1900} max={2200} value={form.releaseYear} onChange={(event) => updateForm('releaseYear', event.target.value ? Number(event.target.value) : '')} />
              </label>
              <label className="admin-field-group">
                <span className="admin-field-label">Status editorial</span>
                <select className="admin-field" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                  {!statusOptions.includes(form.status) && <option value={form.status}>{form.status}</option>}
                  {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="admin-field-group sm:col-span-2">
                <span className="admin-field-label">URL do poster</span>
                <input className="admin-field" type="url" value={form.posterUrl} onChange={(event) => updateForm('posterUrl', event.target.value)} placeholder="https://…" />
              </label>
            </div>
            <div className="space-y-2">
              <span className="admin-field-label">Prévia</span>
              <div className="relative aspect-[2/3] overflow-hidden border border-[var(--admin-line)] bg-[var(--admin-page)]">
                {form.posterUrl ? <SafeImage src={form.posterUrl} alt={`Poster de ${form.title}`} fill className="object-cover" /> : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[var(--admin-dim)]">
                    <ImageIcon size={25} aria-hidden="true" />
                    <span className="text-[11px]">Sem poster informado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">02 / Metadata</p>
              <h2 className="admin-section-title">Descrição editorial</h2>
              <p className="admin-section-description">Texto que contextualiza o título sem depender de uma fonte externa no painel.</p>
            </div>
          </div>
          <label className="admin-field-group">
            <span className="admin-field-label">Sinopse</span>
            <textarea className="admin-field min-h-36 resize-y" rows={6} value={form.description} onChange={(event) => updateForm('description', event.target.value)} aria-describedby="anime-description-help" />
            <small id="anime-description-help" className="admin-field-help">O catálogo e o Kenjitsu continuam sendo a origem dos dados; este campo é a revisão local.</small>
          </label>
        </AdminPanel>

        <AdminPanel>
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">03 / Playback</p>
              <h2 className="admin-section-title">Abertura padrão</h2>
              <p className="admin-section-description">Intervalo herdado por episódios sem configuração própria.</p>
            </div>
            <button type="button" className="admin-button is-secondary" onClick={() => setIsOpeningImportOpen(true)} disabled={!episodes.length}>
              <Sparkles size={16} /> Consultar AniSkip
            </button>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className="admin-field-group">
              <span className="admin-field-label">Início (MM:SS)</span>
              <input className="admin-field font-mono" value={form.openingStart} onChange={(event) => updateForm('openingStart', event.target.value)} placeholder="00:35" inputMode="decimal" />
            </label>
            <label className="admin-field-group">
              <span className="admin-field-label">Fim (MM:SS)</span>
              <input className="admin-field font-mono" value={form.openingEnd} onChange={(event) => updateForm('openingEnd', event.target.value)} placeholder="02:05" inputMode="decimal" />
            </label>
          </div>
          {(form.openingStart || form.openingEnd) && <button type="button" className="admin-button is-ghost mt-4" onClick={() => { updateForm('openingStart', ''); updateForm('openingEnd', ''); }}>Desativar abertura padrão</button>}
        </AdminPanel>
      </form>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <AdminPanel>
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">04 / Episódios</p>
              <h2 className="admin-section-title">Adicionar episódio</h2>
              <p className="admin-section-description">Use a sincronização Kenjitsu para preencher o catálogo quando possível.</p>
            </div>
          </div>
          <form onSubmit={addEpisode} className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="admin-field-group"><span className="admin-field-label">Temporada</span><input className="admin-field" type="number" min={1} value={episodeSeason} onChange={(event) => setEpisodeSeason(Number(event.target.value))} /></label>
              <label className="admin-field-group"><span className="admin-field-label">Número</span><input className="admin-field" type="number" min={1} value={episodeNumber} onChange={(event) => setEpisodeNumber(Number(event.target.value))} /></label>
            </div>
            <label className="admin-field-group"><span className="admin-field-label">Título do episódio</span><input className="admin-field" value={episodeTitle} onChange={(event) => setEpisodeTitle(event.target.value)} placeholder={`Episódio ${episodeNumber}`} /></label>
            <button type="submit" className="admin-button is-primary w-full" disabled={addingEpisode}>
              {addingEpisode ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar episódio
            </button>
          </form>
        </AdminPanel>

        <AdminPanel>
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">Fila de episódios</p>
              <h2 className="admin-section-title">Episódios cadastrados</h2>
            </div>
            <span className="font-mono text-sm text-[#FF6B00]">{episodes.length.toString().padStart(2, '0')}</span>
          </div>
          {episodes.length === 0 ? (
            <AdminEmptyState title="Nenhum episódio cadastrado" description="Sincronize pelo Kenjitsu ou adicione o primeiro episódio manualmente." />
          ) : (
            <div className="mx-4 mb-4 divide-y divide-[var(--admin-line)] border-y border-[var(--admin-line)] sm:mx-5" role="list" aria-label="Episódios cadastrados">
              {episodes.map((episode) => {
                const hasOwnOpening = episode.openingStartSeconds != null && episode.openingEndSeconds != null;
                return (
                  <div key={episode.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" role="listitem">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">S{episode.season}E{episode.number}</span>
                        <span className="admin-status-badge is-healthy">{episode.sources?.length || 0} mídias</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[var(--admin-muted)]">{episode.title || `Episódio ${episode.number}`}</p>
                      <p className="mt-1 text-[11px] text-[var(--admin-dim)]">{hasOwnOpening ? `Abertura própria · ${formatOpeningTime(episode.openingStartSeconds)}–${formatOpeningTime(episode.openingEndSeconds)}` : form.openingStart && form.openingEnd ? 'Herda a abertura padrão' : 'Sem abertura configurada'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="admin-button is-ghost" onClick={() => openEpisodeOpening(episode)}><Film size={14} /> Abertura</button>
                      <button type="button" className="admin-button is-secondary" onClick={() => setSelectedEpisode({ episodeId: episode.id, episodeNumber: episode.number, seasonNumber: episode.season, episodeTitle: episode.title })}><Tv size={14} /> Consultar mídia</button>
                      <button type="button" className="admin-icon-button is-danger" onClick={() => void deleteEpisode(episode.id, episode.number)} aria-label={`Excluir episódio ${episode.number}`}><Trash2 size={15} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminSaveBar dirty={dirty} saving={saving} onSave={() => void saveAnime()} onDiscard={discardChanges} label="Há alterações de catálogo não salvas" />

      {selectedEpisode && <EpisodeSourcesModal isOpen animeId={id} episodeId={selectedEpisode.episodeId} episodeNumber={selectedEpisode.episodeNumber} seasonNumber={selectedEpisode.seasonNumber} episodeTitle={selectedEpisode.episodeTitle || undefined} onClose={() => setSelectedEpisode(null)} onSuccess={() => loadAnime(true)} />}
      <OpeningImportModal animeId={id} isOpen={isOpeningImportOpen} onClose={() => setIsOpeningImportOpen(false)} onSaved={() => loadAnime(true)} onMessage={(type, message) => { if (type === 'success') { setSuccess(message); setError(null); } else { setError(message); } }} />

      <AdminDrawer open={Boolean(openingEpisode)} title={openingEpisode ? `Abertura do episódio ${openingEpisode.number}` : 'Abertura do episódio'} description="Deixe os dois campos vazios para herdar a abertura padrão do anime." onClose={() => setOpeningEpisode(null)} width="default">
        <div className="space-y-5 p-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-field-group"><span className="admin-field-label">Início (MM:SS)</span><input className="admin-field font-mono" value={episodeOpeningStart} onChange={(event) => setEpisodeOpeningStart(event.target.value)} placeholder="00:35" /></label>
            <label className="admin-field-group"><span className="admin-field-label">Fim (MM:SS)</span><input className="admin-field font-mono" value={episodeOpeningEnd} onChange={(event) => setEpisodeOpeningEnd(event.target.value)} placeholder="02:05" /></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--admin-line)] pt-4">
            <button type="button" className="admin-button is-ghost" onClick={() => setOpeningEpisode(null)}>Cancelar</button>
            <button type="button" className="admin-button is-primary" onClick={() => void saveEpisodeOpening()} disabled={savingEpisodeOpening}>
              {savingEpisodeOpening ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar intervalo
            </button>
          </div>
        </div>
      </AdminDrawer>
    </div>
  );
}
