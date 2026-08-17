'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ExternalLink, History, Loader2, Palette, PlayCircle, RotateCcw, Save, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { useConfirmation } from '@/context/ConfirmationContext';
import type { PublicExperienceAdminState, PublicExperienceConfig, ThemePreset } from '@/types/public-experience';
import { DEFAULT_PUBLIC_EXPERIENCE_CONFIG } from '@/lib/public-experience/defaults';

type ExperienceSection = 'appearance' | 'catalog' | 'player' | 'features';
type ThemeKey = keyof PublicExperienceConfig['theme'];
type CatalogKey = keyof PublicExperienceConfig['catalog'];
type PageHeadingKey = keyof PublicExperienceConfig['catalog']['pageHeadings'];
type ThemePatch = Partial<PublicExperienceConfig['theme']>;
type CatalogPatch = Partial<PublicExperienceConfig['catalog']>;
type PlayerPatch = Partial<PublicExperienceConfig['player']>;
type FeaturePatch = Partial<PublicExperienceConfig['features']>;
type PlayerField = [keyof PublicExperienceConfig['player'], string];
type ThemeField = [ThemeKey, string];
type CatalogField = [CatalogKey, string];
type CatalogFilter = PublicExperienceConfig['catalog']['availableFilters'][number];

const catalogFilterOptions: Array<[CatalogFilter, string]> = [
  ['search', 'Busca textual'],
  ['status', 'Status'],
  ['type', 'Tipo'],
  ['genre', 'Gênero'],
  ['year', 'Ano'],
  ['score', 'Nota mínima'],
];

const sectionLinks: Array<{
  id: ExperienceSection;
  label: string;
  href: string;
}> = [
  { id: 'appearance', label: 'Aparência', href: '/admin/settings/appearance' },
  { id: 'catalog', label: 'Catálogo', href: '/admin/settings/catalog' },
  { id: 'player', label: 'Player', href: '/admin/settings/player' },
  {
    id: 'features',
    label: 'Funcionalidades',
    href: '/admin/settings/features',
  },
];

const presetColors: Record<Exclude<ThemePreset, 'custom'>, Partial<PublicExperienceConfig['theme']>> = {
  'anistream-dark': {
    accent: '#ff6b00',
    accentHover: '#ff8129',
    pageBackground: '#0b0b0f',
    surface: '#111219',
    surfaceElevated: '#181a24',
    textPrimary: '#f8f8fa',
    textSecondary: '#b6b8c4',
    focus: '#ff9a52',
  },
  midnight: {
    accent: '#6ea8ff',
    accentHover: '#8bbaff',
    pageBackground: '#070b16',
    surface: '#0f172a',
    surfaceElevated: '#17223b',
    textPrimary: '#f2f6ff',
    textSecondary: '#aab9d6',
    focus: '#93c5fd',
  },
  'high-contrast': {
    accent: '#ffd400',
    accentHover: '#ffe46b',
    pageBackground: '#000000',
    surface: '#090909',
    surfaceElevated: '#171717',
    textPrimary: '#ffffff',
    textSecondary: '#e5e5e5',
    focus: '#fff09c',
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getErrorMessage(payload: any, fallback: string) {
  return typeof payload?.error?.message === 'string' ? payload.error.message : fallback;
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

function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (value: boolean) => void; help?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 border border-[var(--admin-line)] bg-[var(--admin-panel-raised)] p-3">
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--admin-text)]">{label}</span>
        {help && <span className="mt-1 block text-[11px] leading-4 text-[var(--admin-muted)]">{help}</span>}
      </span>
    </label>
  );
}

export function PublicExperienceSettings({ section }: { section: ExperienceSection }) {
  const { confirm } = useConfirmation();
  const [state, setState] = useState<PublicExperienceAdminState | null>(null);
  const [config, setConfig] = useState<PublicExperienceConfig>(clone(DEFAULT_PUBLIC_EXPERIENCE_CONFIG));
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const dirty = Boolean(saved && JSON.stringify(config) !== saved);
  const sectionTitle = sectionLinks.find((item) => item.id === section)?.label || 'Personalização';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings/experience', {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(getErrorMessage(payload, 'Não foi possível carregar a personalização.'));
      const nextState = payload.data as PublicExperienceAdminState;
      setState(nextState);
      setConfig(clone(nextState.draft));
      setSaved(JSON.stringify(nextState.draft));
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível carregar a personalização.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateTheme = (value: Partial<PublicExperienceConfig['theme']>) =>
    setConfig((current) => ({
      ...current,
      theme: { ...current.theme, ...value },
    }));
  const updateBranding = (value: Partial<PublicExperienceConfig['branding']>) =>
    setConfig((current) => ({
      ...current,
      branding: { ...current.branding, ...value },
    }));
  const updateCatalog = (value: Partial<PublicExperienceConfig['catalog']>) =>
    setConfig((current) => ({
      ...current,
      catalog: { ...current.catalog, ...value },
    }));
  const updatePlayer = (value: Partial<PublicExperienceConfig['player']>) =>
    setConfig((current) => ({
      ...current,
      player: { ...current.player, ...value },
    }));
  const updateFeatures = (value: Partial<PublicExperienceConfig['features']>) =>
    setConfig((current) => ({
      ...current,
      features: { ...current.features, ...value },
    }));
  const updateCommunication = (value: Partial<PublicExperienceConfig['communication']>) =>
    setConfig((current) => ({
      ...current,
      communication: { ...current.communication, ...value },
    }));

  const saveDraft = async () => {
    if (!state || saving || !dirty) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/settings/experience', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedDraftVersion: state.draftVersion,
          config,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw Object.assign(new Error(getErrorMessage(payload, 'Não foi possível salvar o rascunho.')), { status: response.status });
      const nextState = payload.data as PublicExperienceAdminState;
      setState(nextState);
      setConfig(clone(nextState.draft));
      setSaved(JSON.stringify(nextState.draft));
      setFeedback({
        tone: 'success',
        message: 'Rascunho de personalização salvo.',
      });
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? error.status : 0;
      setFeedback({
        tone: status === 409 ? 'warning' : 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.',
      });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!state || saving) return;
    if (dirty) {
      setFeedback({
        tone: 'warning',
        message: 'Salve o rascunho antes de publicar.',
      });
      return;
    }
    const accepted = await confirm({
      title: 'Publicar personalização?',
      description: 'As configurações de aparência, catálogo, player e funcionalidades ficarão disponíveis para os usuários.',
      confirmText: 'Publicar',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!accepted) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/settings/experience/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedDraftVersion: state.draftVersion,
          expectedPublishedVersion: state.publishedVersion,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw Object.assign(new Error(getErrorMessage(payload, 'Não foi possível publicar.')), { status: response.status });
      const nextState = payload.data as PublicExperienceAdminState;
      setState(nextState);
      setConfig(clone(nextState.draft));
      setSaved(JSON.stringify(nextState.draft));
      setFeedback({
        tone: 'success',
        message: `Personalização publicada na versão ${nextState.publishedVersion}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível publicar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const createSnapshot = async () => {
    if (!state || saving || dirty)
      return setFeedback({
        tone: 'warning',
        message: 'Salve o rascunho antes de criar um snapshot.',
      });
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/experience/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedDraftVersion: state.draftVersion }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(getErrorMessage(payload, 'Não foi possível criar o snapshot.'));
      setState(payload.data as PublicExperienceAdminState);
      setFeedback({
        tone: 'success',
        message: 'Snapshot criado no histórico.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível criar o snapshot.',
      });
    } finally {
      setSaving(false);
    }
  };

  const restoreSnapshot = async (snapshotId: string, label: string) => {
    if (!state || saving) return;
    const accepted = await confirm({
      title: `Restaurar ${label}?`,
      description: 'A versão será copiada para o rascunho. A publicação atual não será alterada até você publicar.',
      confirmText: 'Restaurar rascunho',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/settings/experience/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedDraftVersion: state.draftVersion }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(getErrorMessage(payload, 'Não foi possível restaurar o snapshot.'));
      const nextState = payload.data as PublicExperienceAdminState;
      setState(nextState);
      setConfig(clone(nextState.draft));
      setSaved(JSON.stringify(nextState.draft));
      setFeedback({
        tone: 'success',
        message: 'Snapshot restaurado no rascunho.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Não foi possível restaurar o snapshot.',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: ThemePreset) => {
    updateTheme({
      preset,
      ...(preset !== 'custom' ? presetColors[preset] : {}),
    });
  };

  const featureEntries = useMemo(() => Object.entries(config.features) as Array<[keyof PublicExperienceConfig['features'], boolean]>, [config.features]);

  if (loading)
    return (
      <div className="admin-empty-state min-h-[420px]" aria-live="polite">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" aria-hidden="true" />
        <h2>Carregando personalização</h2>
        <p>Consultando o rascunho e a versão pública atual.</p>
      </div>
    );
  if (!state)
    return (
      <div className="admin-empty-state min-h-[420px]">
        <h2>Personalização indisponível</h2>
        <p>Não foi possível carregar as configurações públicas.</p>
        <button type="button" className="admin-button is-primary" onClick={() => void load()}>
          Tentar novamente
        </button>
      </div>
    );

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader
        eyebrow="Gerenciar / Experiência"
        title={sectionTitle}
        description="Configure a experiência pública do AniStream com rascunho, preview e publicação controlada."
        breadcrumbs={[{ label: 'Personalização' }, { label: sectionTitle }]}
        status={<AdminStatusBadge status={dirty ? 'degraded' : 'healthy'} label={dirty ? 'Rascunho alterado' : `Publicada v${state.publishedVersion}`} />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/" target="_blank" className="admin-button is-ghost">
              <ExternalLink size={15} /> Abrir site
            </Link>
            <button type="button" className="admin-button is-primary" onClick={() => void publish()} disabled={saving || dirty}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />} Publicar
            </button>
          </div>
        }
      />
      {feedback && (
        <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </AdminFeedback>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--admin-line)] pb-3" role="tablist" aria-label="Seções da personalização">
        {sectionLinks.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={item.id === section}
            className={`admin-button ${item.id === section ? 'is-primary' : 'is-ghost'}`}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/admin/homepage" className="admin-button is-ghost">
          Home
        </Link>
        <Link href="/admin/navigation" className="admin-button is-ghost">
          Navegação
        </Link>
        <Link href="/admin/collections" className="admin-button is-ghost">
          Coleções
        </Link>
      </div>

      {section === 'appearance' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
          <AdminPanel className="p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="admin-eyebrow">Identidade visual</p>
                <h2 className="admin-section-title mt-1">Marca e tema</h2>
                <p className="admin-section-description">Use valores seguros e presets prontos. Não é permitido inserir CSS, HTML ou JavaScript.</p>
              </div>
              <Palette size={20} className="text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da aplicação">
                <input className="admin-field" value={config.branding.appName} onChange={(event) => updateBranding({ appName: event.target.value })} />
              </Field>
              <Field label="Texto da marca">
                <input className="admin-field" value={config.branding.brandText} onChange={(event) => updateBranding({ brandText: event.target.value })} />
              </Field>
              <Field label="Descrição pública" help="Usada em metadata e áreas de apresentação.">
                <textarea
                  className="admin-field min-h-24 resize-y sm:col-span-2"
                  value={config.branding.description}
                  onChange={(event) => updateBranding({ description: event.target.value })}
                />
              </Field>
              <Field label="Logo clara">
                <input className="admin-field" value={config.branding.logoLight} onChange={(event) => updateBranding({ logoLight: event.target.value })} />
              </Field>
              <Field label="Logo escura">
                <input className="admin-field" value={config.branding.logoDark} onChange={(event) => updateBranding({ logoDark: event.target.value })} />
              </Field>
              <Field label="Favicon">
                <input className="admin-field" value={config.branding.favicon} onChange={(event) => updateBranding({ favicon: event.target.value })} />
              </Field>
              <Field label="Fonte">
                <select
                  className="admin-field"
                  value={config.theme.fontFamily}
                  onChange={(event) =>
                    updateTheme({
                      fontFamily: event.target.value as PublicExperienceConfig['theme']['fontFamily'],
                    })
                  }
                >
                  <option value="geist">Geist</option>
                  <option value="system">Sistema</option>
                  <option value="mono">Monoespaçada</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Toggle label="Exibir rodapé" checked={config.branding.showFooter} onChange={(value) => updateBranding({ showFooter: value })} />
              <Toggle
                label="Exibir marca no mobile"
                checked={config.branding.showMobileBrand}
                onChange={(value) => updateBranding({ showMobileBrand: value })}
              />
            </div>
          </AdminPanel>
          <div className="space-y-5">
            <AdminPanel className="p-4 sm:p-5">
              <p className="admin-eyebrow">Preset</p>
              <h2 className="admin-section-title mt-1">Direção visual</h2>
              <div className="mt-4 grid gap-2">
                {(['anistream-dark', 'midnight', 'high-contrast', 'custom'] as ThemePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`flex min-h-12 items-center justify-between border p-3 text-left ${config.theme.preset === preset ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]' : 'border-[var(--admin-line)] bg-[var(--admin-panel-raised)]'}`}
                  >
                    <span className="text-sm font-semibold text-[var(--admin-text)]">
                      {preset === 'anistream-dark'
                        ? 'AniStream Dark'
                        : preset === 'high-contrast'
                          ? 'Alto contraste'
                          : preset === 'midnight'
                            ? 'Midnight'
                            : 'Customizado'}
                    </span>
                    {config.theme.preset === preset && <Check size={16} className="text-[var(--accent)]" />}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(
                  [
                    ['accent', 'Destaque'],
                    ['accentHover', 'Destaque hover'],
                    ['pageBackground', 'Fundo'],
                    ['surface', 'Superfície'],
                    ['surfaceElevated', 'Superfície elevada'],
                    ['focus', 'Foco'],
                  ] as ThemeField[]
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        className="h-11 w-12 shrink-0 cursor-pointer border border-[var(--admin-line)] bg-transparent p-1"
                        value={String(config.theme[key])}
                        onChange={(event) =>
                          updateTheme({
                            [key]: event.target.value,
                          } as ThemePatch)
                        }
                      />
                      <input
                        className="admin-field min-w-0 font-mono text-xs"
                        value={String(config.theme[key])}
                        onChange={(event) =>
                          updateTheme({
                            [key]: event.target.value,
                          } as ThemePatch)
                        }
                      />
                    </div>
                  </Field>
                ))}
              </div>
            </AdminPanel>
            <AdminPanel className="p-4 sm:p-5">
              <p className="admin-eyebrow">Comunicação</p>
              <h2 className="admin-section-title mt-1">Rodapé e versão</h2>
              <div className="mt-4 space-y-4">
                <Field label="Descrição do rodapé">
                  <textarea
                    className="admin-field min-h-20 resize-y"
                    value={config.communication.footerDescription}
                    onChange={(event) =>
                      updateCommunication({
                        footerDescription: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Crédito">
                  <input
                    className="admin-field"
                    value={config.communication.footerCredit}
                    onChange={(event) => updateCommunication({ footerCredit: event.target.value })}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Versão">
                    <input
                      className="admin-field"
                      value={config.communication.versionLabel}
                      onChange={(event) =>
                        updateCommunication({
                          versionLabel: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Toggle
                    label="Badge de versão"
                    checked={config.communication.showVersionBadge}
                    onChange={(value) => updateCommunication({ showVersionBadge: value })}
                  />
                </div>
              </div>
            </AdminPanel>
          </div>
        </div>
      )}

      {section === 'catalog' && (
        <AdminPanel className="p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Apresentação do catálogo</p>
              <h2 className="admin-section-title mt-1">Cards, filtros e páginas</h2>
              <p className="admin-section-description">Defina defaults para novas sessões sem alterar o contrato do Kenjitsu.</p>
            </div>
            <Settings2 size={20} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Itens por página">
              <input
                className="admin-field"
                type="number"
                min={6}
                max={48}
                value={config.catalog.defaultPageSize}
                onChange={(event) =>
                  updateCatalog({
                    defaultPageSize: Math.min(48, Math.max(6, Number(event.target.value) || 24)),
                  })
                }
              />
            </Field>
            <Field label="Colunas mobile">
              <select
                className="admin-field"
                value={config.catalog.columns.mobile}
                onChange={(event) =>
                  updateCatalog({
                    columns: {
                      ...config.catalog.columns,
                      mobile: Number(event.target.value) as 2 | 3,
                    },
                  })
                }
              >
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </Field>
            <Field label="Colunas tablet">
              <select
                className="admin-field"
                value={config.catalog.columns.tablet}
                onChange={(event) =>
                  updateCatalog({
                    columns: {
                      ...config.catalog.columns,
                      tablet: Number(event.target.value) as 3 | 4 | 5,
                    },
                  })
                }
              >
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </Field>
            <Field label="Colunas desktop">
              <select
                className="admin-field"
                value={config.catalog.columns.desktop}
                onChange={(event) =>
                  updateCatalog({
                    columns: {
                      ...config.catalog.columns,
                      desktop: Number(event.target.value) as 4 | 5 | 6 | 7,
                    },
                  })
                }
              >
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Densidade">
              <select
                className="admin-field"
                value={config.catalog.cardDensity}
                onChange={(event) =>
                  updateCatalog({
                    cardDensity: event.target.value as PublicExperienceConfig['catalog']['cardDensity'],
                  })
                }
              >
                <option value="compact">Compacta</option>
                <option value="comfortable">Confortável</option>
                <option value="spacious">Espaçosa</option>
              </select>
            </Field>
            <Field label="Ordenação padrão">
              <select
                className="admin-field"
                value={config.catalog.defaultSort}
                onChange={(event) =>
                  updateCatalog({
                    defaultSort: event.target.value as PublicExperienceConfig['catalog']['defaultSort'],
                  })
                }
              >
                <option value="popularity">Popularidade</option>
                <option value="score">Nota</option>
                <option value="title">Título</option>
                <option value="year">Ano</option>
              </select>
            </Field>
            <Field label="Imagem fallback">
              <input
                className="admin-field"
                value={config.catalog.placeholderImage}
                onChange={(event) => updateCatalog({ placeholderImage: event.target.value })}
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['showScore', 'Mostrar nota'],
                ['showYear', 'Mostrar ano'],
                ['showType', 'Mostrar tipo'],
                ['showStatus', 'Mostrar status'],
                ['showEpisodes', 'Mostrar episódios'],
                ['showGenres', 'Mostrar gêneros'],
              ] as CatalogField[]
            ).map(([key, label]) => (
              <Toggle key={key} label={label} checked={Boolean(config.catalog[key])} onChange={(value) => updateCatalog({ [key]: value } as CatalogPatch)} />
            ))}
          </div>
          <div className="mt-5 border-t border-[var(--admin-line)] pt-5">
            <p className="admin-eyebrow">Filtros disponíveis</p>
            <p className="admin-section-description">Defina quais filtros o catálogo deve priorizar na interface pública.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalogFilterOptions.map(([filter, label]) => (
                <Toggle
                  key={filter}
                  label={label}
                  checked={config.catalog.availableFilters.includes(filter)}
                  onChange={(enabled) =>
                    updateCatalog({
                      availableFilters: enabled
                        ? Array.from(new Set([...config.catalog.availableFilters, filter]))
                        : config.catalog.availableFilters.filter((item) => item !== filter),
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-[var(--admin-line)] pt-5">
            <p className="admin-eyebrow">Cabeçalhos públicos</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(config.catalog.pageHeadings) as PageHeadingKey[]).map((key) => (
                <Field
                  key={key}
                  label={
                    key === 'catalog'
                      ? 'Catálogo'
                      : key === 'popular'
                        ? 'Populares'
                        : key === 'seasons'
                          ? 'Temporadas'
                          : key === 'movies'
                            ? 'Filmes'
                            : 'Pesquisa'
                  }
                >
                  <input
                    className="admin-field"
                    value={config.catalog.pageHeadings[key]}
                    onChange={(event) =>
                      updateCatalog({
                        pageHeadings: {
                          ...config.catalog.pageHeadings,
                          [key]: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
        </AdminPanel>
      )}

      {section === 'player' && (
        <AdminPanel className="p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Preferências de reprodução</p>
              <h2 className="admin-section-title mt-1">Player e fontes</h2>
              <p className="admin-section-description">São defaults globais; o usuário ainda pode sobrescrever preferências locais no navegador.</p>
            </div>
            <PlayCircle size={20} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Áudio padrão">
              <select
                className="admin-field"
                value={config.player.defaultAudio}
                onChange={(event) =>
                  updatePlayer({
                    defaultAudio: event.target.value as PublicExperienceConfig['player']['defaultAudio'],
                  })
                }
              >
                <option value="auto">Automático</option>
                <option value="ja">Japonês</option>
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
                <option value="es">Espanhol</option>
              </select>
            </Field>
            <Field label="Legenda padrão">
              <select
                className="admin-field"
                value={config.player.defaultSubtitle}
                onChange={(event) =>
                  updatePlayer({
                    defaultSubtitle: event.target.value as PublicExperienceConfig['player']['defaultSubtitle'],
                  })
                }
              >
                <option value="auto">Automática</option>
                <option value="off">Desativada</option>
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
                <option value="id">Indonésio</option>
                <option value="th">Tailandês</option>
              </select>
            </Field>
            <Field label="Qualidade">
              <select
                className="admin-field"
                value={config.player.defaultQuality}
                onChange={(event) =>
                  updatePlayer({
                    defaultQuality: event.target.value as PublicExperienceConfig['player']['defaultQuality'],
                  })
                }
              >
                <option value="auto">Auto</option>
                <option value="360p">360p</option>
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </Field>
            <Field label="Velocidade">
              <input
                className="admin-field"
                type="number"
                min="0.5"
                max="2"
                step="0.05"
                value={config.player.defaultSpeed}
                onChange={(event) =>
                  updatePlayer({
                    defaultSpeed: Math.min(2, Math.max(0.5, Number(event.target.value) || 1)),
                  })
                }
              />
            </Field>
            <Field label="TTL do cache (segundos)">
              <input
                className="admin-field"
                type="number"
                min={15}
                max={240}
                value={config.player.cacheTtlSeconds}
                onChange={(event) =>
                  updatePlayer({
                    cacheTtlSeconds: Math.min(240, Math.max(15, Number(event.target.value) || 240)),
                  })
                }
              />
            </Field>
            <Field label="Extensões participantes" help="IDs separados por vírgula; a allowlist do beta continua sendo aplicada.">
              <input
                className="admin-field"
                value={config.player.preferredExtensions.join(', ')}
                onChange={(event) =>
                  updatePlayer({
                    preferredExtensions: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['autoplay', 'Reprodução automática'],
                ['showSourcePicker', 'Permitir trocar fonte'],
                ['showReport', 'Exibir relatório'],
                ['keyboardShortcuts', 'Atalhos de teclado'],
                ['markCompleted', 'Marcar como concluído'],
                ['preCacheNextEpisode', 'Pré-cache do próximo episódio'],
              ] as PlayerField[]
            ).map(([key, label]) => (
              <Toggle key={key} label={label} checked={Boolean(config.player[key])} onChange={(value) => updatePlayer({ [key]: value } as PlayerPatch)} />
            ))}
          </div>
          <div className="mt-5 grid gap-4 border-t border-[var(--admin-line)] pt-5 sm:grid-cols-2">
            <Field label="Pular abertura (segundos)">
              <input
                className="admin-field"
                type="number"
                min={0}
                max={600}
                value={config.player.skipOpeningSeconds}
                onChange={(event) =>
                  updatePlayer({
                    skipOpeningSeconds: Math.min(600, Math.max(0, Number(event.target.value) || 0)),
                  })
                }
              />
            </Field>
            <Field label="Pular encerramento (segundos)">
              <input
                className="admin-field"
                type="number"
                min={0}
                max={600}
                value={config.player.skipEndingSeconds}
                onChange={(event) =>
                  updatePlayer({
                    skipEndingSeconds: Math.min(600, Math.max(0, Number(event.target.value) || 0)),
                  })
                }
              />
            </Field>
          </div>
        </AdminPanel>
      )}

      {section === 'features' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.7fr)]">
          <AdminPanel className="p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="admin-eyebrow">Disponibilidade pública</p>
                <h2 className="admin-section-title mt-1">Funcionalidades</h2>
                <p className="admin-section-description">Desative recursos inteiros sem apagar dados ou alterar rotas diretamente.</p>
              </div>
              <Sparkles size={20} className="text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {featureEntries.map(([key, value]) => (
                <Toggle
                  key={key}
                  label={
                    key === 'watchHistory'
                      ? 'Histórico de reprodução'
                      : key === 'advancedPlayer'
                        ? 'Player avançado'
                        : key === 'publicAnnouncements'
                          ? 'Comunicados públicos'
                          : key === 'maintenanceBanner'
                            ? 'Banner de manutenção'
                            : key === 'changelog'
                              ? 'Changelog'
                              : key.charAt(0).toUpperCase() + key.slice(1)
                  }
                  checked={value}
                  onChange={(next) => updateFeatures({ [key]: next } as FeaturePatch)}
                />
              ))}
            </div>
          </AdminPanel>
          <AdminPanel className="p-4 sm:p-5">
            <p className="admin-eyebrow">Estado</p>
            <h2 className="admin-section-title mt-1">Rascunho e publicação</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--admin-muted)]">
              <p>
                <strong className="text-[var(--admin-text)]">Rascunho:</strong> v{state.draftVersion}
              </p>
              <p>
                <strong className="text-[var(--admin-text)]">Publicado:</strong> v{state.publishedVersion}
              </p>
              <p>
                <strong className="text-[var(--admin-text)]">Última publicação:</strong> {new Date(state.publishedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </AdminPanel>
        </div>
      )}

      <AdminPanel>
        <div className="admin-panel-header flex-wrap">
          <div>
            <p className="admin-eyebrow">
              <History size={13} className="mr-1 inline" /> Histórico
            </p>
            <h2 className="admin-section-title mt-1">Snapshots da personalização</h2>
            <p className="admin-section-description">Restaure no rascunho sem alterar a versão publicada até confirmar uma nova publicação.</p>
          </div>
          <button type="button" className="admin-button is-secondary" onClick={() => void createSnapshot()} disabled={saving || dirty}>
            <Save size={15} /> Criar snapshot
          </button>
        </div>
        <div className="divide-y divide-[var(--admin-line)]">
          {state.snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-[var(--admin-text)]">{snapshot.label}</strong>
                  <AdminStatusBadge
                    status={snapshot.kind === 'PUBLISHED' ? 'healthy' : 'unknown'}
                    label={snapshot.kind === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Versão {snapshot.version} · {new Date(snapshot.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                className="admin-button is-ghost self-start"
                onClick={() => void restoreSnapshot(snapshot.id, snapshot.label)}
                disabled={saving}
              >
                <RotateCcw size={14} /> Restaurar
              </button>
            </div>
          ))}
        </div>
      </AdminPanel>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--admin-dim)]">
        <Check size={14} className="text-emerald-400" /> Alterações públicas só entram no ar após publicação.{' '}
        <button
          type="button"
          className="admin-button is-ghost ml-auto"
          onClick={() => {
            setConfig(clone(state.draft));
            setSaved(JSON.stringify(state.draft));
          }}
          disabled={!dirty || saving}
        >
          <Trash2 size={14} /> Descartar alterações locais
        </button>
      </div>
      <AdminSaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void saveDraft()}
        onDiscard={() => {
          setConfig(clone(state.draft));
          setSaved(JSON.stringify(state.draft));
        }}
        label="Há alterações locais na personalização"
      />
    </div>
  );
}
