'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Eye, EyeOff, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useConfirmation } from '@/context/ConfirmationContext';
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar, AdminStatusBadge } from '@/components/admin';
import { SafeImage } from '@/components/ui/SafeImage';
import { addDays, localWeekStart, weekdayForDateKey } from '@/lib/calendar/time';
import type {
  CalendarExceptionMode,
  CalendarRuleMode,
  ReleaseScheduleAnimeSummary,
  ReleaseScheduleCalendar,
  ReleaseScheduleExceptionView,
  ReleaseScheduleRuleView,
  ReleaseScheduleSettings,
} from '@/types/calendar';

type DraftRule = Omit<ReleaseScheduleRuleView, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type DraftException = Omit<ReleaseScheduleExceptionView, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type EditableCalendarState = {
  settings: ReleaseScheduleSettings;
  rules: DraftRule[];
  exceptions: DraftException[];
  preview: ReleaseScheduleCalendar;
};
type CatalogAnime = ReleaseScheduleAnimeSummary & {
  identifiers?: Array<{ provider: string; value: string }>;
};

const TIMEZONES = ['Asia/Tokyo', 'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'UTC'];
const DAY_OPTIONS = [
  [0, 'Domingo'], [1, 'Segunda-feira'], [2, 'Terça-feira'], [3, 'Quarta-feira'], [4, 'Quinta-feira'], [5, 'Sexta-feira'], [6, 'Sábado'],
] as const;

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

function formatTime(minutes: number | null): string {
  if (minutes == null) return '—';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function parseTime(value: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return Math.min(1439, Math.max(0, hours * 60 + minutes));
}

function getAnilistId(item: { identifiers?: Array<{ provider: string; value: string }> }): number | null {
  const identifier = item.identifiers?.find((entry) => ['anilist', 'kenjitsu'].includes(entry.provider.toLowerCase()) && /^\d+$/.test(entry.value));
  return identifier ? Number(identifier.value) : null;
}

function editableSnapshot(state: EditableCalendarState): string {
  return JSON.stringify({ settings: state.settings, rules: state.rules, exceptions: state.exceptions });
}

function normalizeState(value: EditableCalendarState): EditableCalendarState {
  return {
    settings: value.settings,
    rules: value.rules,
    exceptions: value.exceptions,
    preview: value.preview,
  };
}

function modeLabel(mode: CalendarRuleMode | CalendarExceptionMode): string {
  if (mode === 'ADD') return 'Adicionar';
  if (mode === 'OVERRIDE' || mode === 'MOVE') return 'Substituir';
  return 'Ocultar';
}

function Preview({ calendar }: { calendar: ReleaseScheduleCalendar }) {
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {calendar.days.map((day) => (
        <section key={day.date} className="overflow-hidden border border-[var(--admin-line)] bg-[var(--admin-panel-raised)]">
          <header className="border-b border-[var(--admin-line)] px-3 py-2"><p className="text-[.68rem] font-black uppercase tracking-wider text-[var(--accent)]">{day.shortLabel}</p><p className="mt-0.5 font-mono text-[.68rem] text-[var(--admin-dim)]">{day.date}</p></header>
          <div className="divide-y divide-[var(--admin-line)]">
            {day.items.length ? day.items.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 px-2.5 py-2"><span className="relative size-8 shrink-0 overflow-hidden rounded bg-black/30">{item.posterUrl ? <SafeImage src={item.posterUrl} alt="" fill className="object-cover" /> : null}</span><span className="min-w-0"><strong className="block truncate text-[.68rem] text-[var(--admin-text)]">{item.title}</strong><small className="mt-0.5 flex items-center gap-1 text-[.62rem] text-[var(--admin-muted)]"><Clock3 size={10} />{item.time}</small></span></div>) : <p className="px-2.5 py-4 text-[.68rem] text-[var(--admin-dim)]">Sem lançamentos</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AdminCalendarPage() {
  const [state, setState] = useState<EditableCalendarState | null>(null);
  const [savedState, setSavedState] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [previewTimezone, setPreviewTimezone] = useState(getBrowserTimezone());
  const [ruleForm, setRuleForm] = useState<{ id?: string; animeId: string; anime: ReleaseScheduleAnimeSummary | null; mode: CalendarRuleMode; weekday: number | null; timeMinutes: number | null; timezone: string; enabled: boolean }>({ animeId: '', anime: null, mode: 'ADD', weekday: 1, timeMinutes: 1200, timezone: 'Asia/Tokyo', enabled: true });
  const [exceptionForm, setExceptionForm] = useState<{ id?: string; animeId: string; anime: ReleaseScheduleAnimeSummary | null; dateKey: string; mode: CalendarExceptionMode; weekday: number | null; timeMinutes: number | null; timezone: string; enabled: boolean }>({ animeId: '', anime: null, dateKey: '', mode: 'MOVE', weekday: 1, timeMinutes: 1200, timezone: 'Asia/Tokyo', enabled: true });
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogAnime[]>([]);
  const [catalogTarget, setCatalogTarget] = useState<'rule' | 'exception'>('rule');
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const { confirm } = useConfirmation();

  const load = async (timezone = previewTimezone) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/calendar?timezone=${encodeURIComponent(timezone)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível carregar o calendário.');
      const nextState = normalizeState(payload.data);
      setState(nextState);
      setSavedState(editableSnapshot(nextState));
      setExceptionForm((current) => ({ ...current, dateKey: current.dateKey || nextState.preview.weekStart, weekday: current.dateKey ? current.weekday : weekdayForDateKey(nextState.preview.weekStart) }));
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível carregar o calendário.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // A carga inicial sincroniza dados externos; a atualização de estado é intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = Boolean(state && editableSnapshot(state) !== savedState);

  const searchCatalog = async () => {
    if (catalogQuery.trim().length < 2) return;
    setSearchingCatalog(true);
    try {
      const response = await fetch(`/api/admin/animes?q=${encodeURIComponent(catalogQuery.trim())}&page=1&limit=8`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao pesquisar o catálogo.');
      setCatalogResults((payload.animes || []).map((item: CatalogAnime) => ({ id: item.id, title: item.title, originalTitle: item.originalTitle || null, posterUrl: item.posterUrl || null, anilistId: getAnilistId(item), identifiers: item.identifiers })));
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Falha ao pesquisar o catálogo.' });
    } finally {
      setSearchingCatalog(false);
    }
  };

  const selectCatalogAnime = (anime: CatalogAnime) => {
    const summary: ReleaseScheduleAnimeSummary = { id: anime.id, title: anime.title, originalTitle: anime.originalTitle || null, posterUrl: anime.posterUrl || null, anilistId: getAnilistId(anime) };
    if (catalogTarget === 'rule') {
      setRuleForm((current) => ({ ...current, animeId: summary.id, anime: summary }));
    } else {
      setExceptionForm((current) => ({ ...current, animeId: summary.id, anime: summary }));
    }
    setCatalogResults([]);
    setCatalogQuery(summary.title);
  };

  const renderCatalogResults = () => catalogResults.length > 0 ? (
    <div className="max-h-48 overflow-y-auto border border-[var(--admin-line)] bg-[var(--admin-page)]">
      {catalogResults.map((anime) => (
        <button key={anime.id} type="button" className="flex w-full items-center gap-2 border-b border-[var(--admin-line)] px-3 py-2 text-left last:border-0 hover:bg-white/[0.05]" onClick={() => selectCatalogAnime(anime)}>
          <span className="relative size-8 shrink-0 overflow-hidden rounded bg-black/30">
            {anime.posterUrl ? <SafeImage src={anime.posterUrl} alt="" fill className="object-cover" /> : null}
          </span>
          <span className="min-w-0"><strong className="block truncate text-xs text-[var(--admin-text)]">{anime.title}</strong><small className="block truncate text-[10px] text-[var(--admin-dim)]">{getAnilistId(anime) ? `AniList #${getAnilistId(anime)}` : 'Sem AniList'}</small></span>
        </button>
      ))}
    </div>
  ) : null;

  const editRule = (rule: DraftRule) => setRuleForm({ id: rule.id, animeId: rule.animeId, anime: rule.anime, mode: rule.mode, weekday: rule.weekday, timeMinutes: rule.timeMinutes, timezone: rule.timezone, enabled: rule.enabled });
  const editException = (exception: DraftException) => setExceptionForm({ id: exception.id, animeId: exception.animeId, anime: exception.anime, dateKey: exception.dateKey, mode: exception.mode, weekday: exception.weekday, timeMinutes: exception.timeMinutes, timezone: exception.timezone, enabled: exception.enabled });

  const upsertRule = () => {
    if (!state || !ruleForm.anime || !ruleForm.animeId) return setFeedback({ tone: 'warning', message: 'Selecione um anime do catálogo.' });
    if (ruleForm.mode !== 'HIDE' && (ruleForm.weekday == null || ruleForm.timeMinutes == null)) return setFeedback({ tone: 'warning', message: 'Informe dia e horário para esta regra.' });
    if (state.rules.some((rule) => rule.animeId === ruleForm.animeId && rule.id !== ruleForm.id)) return setFeedback({ tone: 'warning', message: 'Este anime já possui uma regra semanal.' });
    const rule: DraftRule = { id: ruleForm.id, animeId: ruleForm.animeId, anime: ruleForm.anime, mode: ruleForm.mode, weekday: ruleForm.mode === 'HIDE' ? null : ruleForm.weekday as DraftRule['weekday'], timeMinutes: ruleForm.mode === 'HIDE' ? null : ruleForm.timeMinutes, timezone: ruleForm.timezone, enabled: ruleForm.enabled };
    setState((current) => current ? { ...current, rules: rule.id ? current.rules.map((item) => item.id === rule.id ? rule : item) : [...current.rules, rule] } : current);
    setRuleForm({ animeId: '', anime: null, mode: 'ADD', weekday: 1, timeMinutes: 1200, timezone: 'Asia/Tokyo', enabled: true });
    setCatalogQuery('');
  };

  const removeRule = async (rule: DraftRule) => {
    if (!state || !(await confirm({ title: 'Remover regra semanal?', description: `A regra de “${rule.anime.title}” será removida e o calendário automático poderá voltar a aparecer.`, confirmText: 'Remover regra', cancelText: 'Cancelar', variant: 'danger' }))) return;
    setState((current) => current ? { ...current, rules: current.rules.filter((item) => item.id !== rule.id) } : current);
  };

  const upsertException = () => {
    if (!state || !exceptionForm.anime || !exceptionForm.animeId) return setFeedback({ tone: 'warning', message: 'Selecione um anime do catálogo.' });
    if (!exceptionForm.dateKey) return setFeedback({ tone: 'warning', message: 'Informe a data da exceção.' });
    if (exceptionForm.mode !== 'HIDE' && exceptionForm.timeMinutes == null) return setFeedback({ tone: 'warning', message: 'Informe o horário da exceção.' });
    if (state.exceptions.some((exception) => exception.animeId === exceptionForm.animeId && exception.dateKey === exceptionForm.dateKey && exception.id !== exceptionForm.id)) return setFeedback({ tone: 'warning', message: 'Este anime já possui uma exceção para essa data.' });
    const exception: DraftException = { id: exceptionForm.id, animeId: exceptionForm.animeId, anime: exceptionForm.anime, dateKey: exceptionForm.dateKey, mode: exceptionForm.mode, weekday: exceptionForm.mode === 'HIDE' ? null : exceptionForm.weekday as DraftException['weekday'], timeMinutes: exceptionForm.mode === 'HIDE' ? null : exceptionForm.timeMinutes, timezone: exceptionForm.timezone, enabled: exceptionForm.enabled };
    setState((current) => current ? { ...current, exceptions: exception.id ? current.exceptions.map((item) => item.id === exception.id ? exception : item) : [...current.exceptions, exception] } : current);
    setExceptionForm((current) => ({ ...current, id: undefined, animeId: '', anime: null, dateKey: state.preview.weekStart, weekday: weekdayForDateKey(state.preview.weekStart), mode: 'MOVE', timeMinutes: 1200 }));
    setCatalogQuery('');
  };

  const removeException = async (exception: DraftException) => {
    if (!state || !(await confirm({ title: 'Remover exceção?', description: `A alteração pontual de “${exception.anime.title}” em ${exception.dateKey} será removida.`, confirmText: 'Remover exceção', cancelText: 'Cancelar', variant: 'danger' }))) return;
    setState((current) => current ? { ...current, exceptions: current.exceptions.filter((item) => item.id !== exception.id) } : current);
  };

  const save = async () => {
    if (!state) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/calendar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: state.settings, rules: state.rules, exceptions: state.exceptions }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível salvar o calendário.');
      const nextState = normalizeState(payload.data);
      setState(nextState);
      setSavedState(editableSnapshot(nextState));
      setFeedback({ tone: 'success', message: 'Configuração do calendário salva e registrada na auditoria.' });
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível salvar o calendário.' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    void load();
    setFeedback({ tone: 'success', message: 'Alterações locais descartadas.' });
  };

  const sync = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/calendar/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: previewTimezone }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível sincronizar o calendário.');
      const nextState = normalizeState(payload.data);
      setState(nextState);
      setSavedState(editableSnapshot(nextState));
      setFeedback({ tone: nextState.preview.warnings.length ? 'warning' : 'success', message: nextState.preview.warnings.length ? 'Sincronização concluída com avisos parciais.' : 'Calendário sincronizado pelo Kenjitsu.' });
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível sincronizar o calendário.' });
    } finally {
      setSyncing(false);
    }
  };

  const updatePreviewTimezone = (value: string) => {
    setPreviewTimezone(value);
    void load(value);
  };

  if (loading || !state) return <div className="admin-empty-state min-h-[420px]" aria-live="polite"><Loader2 size={24} className="animate-spin text-[#FF6B00]" /><h2>Carregando calendário</h2><p>Consultando regras locais e programação do Kenjitsu.</p></div>;

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader eyebrow="Gerenciar / Experiência" title="Release Schedule" description="Configure a grade semanal automática do Kenjitsu e faça ajustes controlados por anime ou por data." breadcrumbs={[{ label: 'Navegação', href: '/admin/navigation' }, { label: 'Calendário' }]} status={<AdminStatusBadge status={state.preview.state === 'healthy' ? 'healthy' : state.preview.state === 'degraded' ? 'degraded' : 'unknown'} label={state.preview.state === 'healthy' ? 'Agenda operacional' : state.preview.state === 'degraded' ? 'Agenda parcial' : 'Sem lançamentos'} />} actions={<div className="flex flex-wrap gap-2"><Link href="/admin/navigation" className="admin-button is-ghost">Visibilidade da página</Link><button type="button" className="admin-button is-secondary" onClick={() => void sync()} disabled={syncing || saving}>{syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}Sincronizar agora</button></div>} />
      {feedback && <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</AdminFeedback>}

      <datalist id="calendar-timezones">{TIMEZONES.map((timezone) => <option key={timezone} value={timezone} />)}</datalist>

      <AdminPanel>
        <div className="admin-panel-header"><div><p className="admin-eyebrow">Política do calendário</p><h2 className="admin-section-title">Configurações gerais</h2><p className="admin-section-description">O visitante verá os horários convertidos para o próprio timezone. Regras manuais usam o fuso de origem informado abaixo.</p></div><CalendarDays size={21} className="text-[var(--accent)]" aria-hidden="true" /></div>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <label className="admin-field-group"><span className="admin-field-label">Sincronização Kenjitsu</span><select className="admin-field" value={state.settings.autoSyncEnabled ? 'on' : 'off'} onChange={(event) => setState((current) => current ? { ...current, settings: { ...current.settings, autoSyncEnabled: event.target.value === 'on' } } : current)}><option value="on">Ativa</option><option value="off">Desativada</option></select><span className="admin-field-help">Desativar mantém apenas as regras e exceções locais.</span></label>
          <label className="admin-field-group"><span className="admin-field-label">Arredondamento</span><select className="admin-field" value={state.settings.roundingMinutes} onChange={(event) => setState((current) => current ? { ...current, settings: { ...current.settings, roundingMinutes: Number(event.target.value) as 30 | 60 } } : current)}><option value="30">Blocos de 30 minutos</option><option value="60">Blocos de 1 hora</option></select><span className="admin-field-help">A interface sempre identifica o horário como aproximado.</span></label>
          <label className="admin-field-group"><span className="admin-field-label">Página pública</span><select className="admin-field" value={state.settings.pageEnabled ? 'on' : 'off'} onChange={(event) => setState((current) => current ? { ...current, settings: { ...current.settings, pageEnabled: event.target.value === 'on' } } : current)}><option value="on">Disponível</option><option value="off">Desativada</option></select><span className="admin-field-help">A navegação também pode controlar o link público.</span></label>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="admin-panel-header flex-wrap items-center"><div><p className="admin-eyebrow">Prévia operacional</p><h2 className="admin-section-title">Grade da semana</h2><p className="admin-section-description">Confira o resultado no timezone selecionado antes de publicar as alterações.</p></div><label className="admin-field-group min-w-52"><span className="admin-field-label">Timezone da prévia</span><select className="admin-field" value={previewTimezone} onChange={(event) => updatePreviewTimezone(event.target.value)}>{TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></label></div>
        <div className="p-4 sm:p-5"><Preview calendar={state.preview} /></div>
      </AdminPanel>

      <AdminPanel>
        <div className="admin-panel-header flex-wrap items-center"><div><p className="admin-eyebrow">Regras recorrentes</p><h2 className="admin-section-title">Um horário semanal por anime</h2><p className="admin-section-description">Adicionar força um horário local; substituir troca a agenda automática; ocultar impede o anime de aparecer.</p></div><span className="font-mono text-[11px] text-[var(--admin-dim)]">{state.rules.length} regra(s)</span></div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3 border border-[var(--admin-line)] bg-[var(--admin-panel-raised)] p-4">
            <div><p className="text-xs font-bold text-[var(--admin-text)]">{ruleForm.id ? 'Editar regra' : 'Adicionar regra'}</p><p className="mt-1 text-[11px] text-[var(--admin-dim)]">Selecione um anime já existente no catálogo local.</p></div>
            <label className="admin-field-group"><span className="admin-field-label">Anime</span><div className="flex gap-2"><input className="admin-field min-w-0" value={catalogTarget === 'rule' ? catalogQuery : ''} onFocus={() => setCatalogTarget('rule')} onChange={(event) => { setCatalogTarget('rule'); setCatalogQuery(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCatalog(); } }} placeholder="Pesquisar título" /><button type="button" className="admin-button is-secondary shrink-0 px-3" onClick={() => { setCatalogTarget('rule'); void searchCatalog(); }} disabled={searchingCatalog || catalogQuery.trim().length < 2}>{searchingCatalog && catalogTarget === 'rule' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}<span className="sr-only">Pesquisar anime</span></button></div></label>
            {catalogTarget === 'rule' && renderCatalogResults()}
            {ruleForm.anime && <div className="flex items-center gap-2 border border-[#FF6B00]/30 bg-[#FF6B00]/[0.06] p-2 text-xs text-[var(--admin-text)]"><span className="min-w-0 flex-1 truncate">{ruleForm.anime.title}</span><button type="button" className="admin-icon-button" onClick={() => setRuleForm((current) => ({ ...current, animeId: '', anime: null }))} aria-label="Limpar anime selecionado"><X size={14} /></button></div>}
            <label className="admin-field-group"><span className="admin-field-label">Ação</span><select className="admin-field" value={ruleForm.mode} onChange={(event) => setRuleForm((current) => ({ ...current, mode: event.target.value as CalendarRuleMode }))}><option value="ADD">Adicionar horário</option><option value="OVERRIDE">Substituir Kenjitsu</option><option value="HIDE">Ocultar programação</option></select></label>
            {ruleForm.mode !== 'HIDE' && <div className="grid grid-cols-2 gap-3"><label className="admin-field-group"><span className="admin-field-label">Dia</span><select className="admin-field" value={ruleForm.weekday ?? ''} onChange={(event) => setRuleForm((current) => ({ ...current, weekday: event.target.value === '' ? null : Number(event.target.value) }))}><option value="">Escolher</option>{DAY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="admin-field-group"><span className="admin-field-label">Horário</span><input className="admin-field" type="time" value={formatTime(ruleForm.timeMinutes)} onChange={(event) => setRuleForm((current) => ({ ...current, timeMinutes: parseTime(event.target.value) }))} /></label></div>}
            <label className="admin-field-group"><span className="admin-field-label">Fuso de origem</span><input className="admin-field" list="calendar-timezones" value={ruleForm.timezone} onChange={(event) => setRuleForm((current) => ({ ...current, timezone: event.target.value }))} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Estado</span><select className="admin-field" value={ruleForm.enabled ? 'on' : 'off'} onChange={(event) => setRuleForm((current) => ({ ...current, enabled: event.target.value === 'on' }))}><option value="on">Ativa</option><option value="off">Inativa</option></select></label>
            <div className="flex flex-wrap gap-2"><button type="button" className="admin-button is-primary" onClick={upsertRule}><Check size={15} />{ruleForm.id ? 'Atualizar regra' : 'Adicionar regra'}</button>{ruleForm.id && <button type="button" className="admin-button is-ghost" onClick={() => setRuleForm({ animeId: '', anime: null, mode: 'ADD', weekday: 1, timeMinutes: 1200, timezone: 'Asia/Tokyo', enabled: true })}>Cancelar</button>}</div>
          </div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Anime</th><th>Ação</th><th>Grade</th><th>Status</th><th className="text-right">Ações</th></tr></thead><tbody>{state.rules.length ? state.rules.map((rule) => <tr key={rule.id || `${rule.animeId}-${rule.mode}`}><td><strong className="block max-w-48 truncate text-[var(--admin-text)]">{rule.anime.title}</strong><small className="text-[10px] text-[var(--admin-dim)]">{rule.anime.anilistId ? `AniList #${rule.anime.anilistId}` : 'Sem AniList'}</small></td><td>{modeLabel(rule.mode)}</td><td>{rule.mode === 'HIDE' ? '—' : `${DAY_OPTIONS.find(([value]) => value === rule.weekday)?.[1] || '—'} · ${formatTime(rule.timeMinutes)}`}</td><td><AdminStatusBadge status={rule.enabled ? 'healthy' : 'unknown'} label={rule.enabled ? 'Ativa' : 'Inativa'} /></td><td><div className="flex justify-end gap-1"><button type="button" className="admin-button is-ghost px-2" onClick={() => editRule(rule)} aria-label={`Editar regra de ${rule.anime.title}`}><Eye size={14} /></button><button type="button" className="admin-button is-danger px-2" onClick={() => void removeRule(rule)} aria-label={`Remover regra de ${rule.anime.title}`}><Trash2 size={14} /></button></div></td></tr>) : <tr><td colSpan={5}><AdminEmptyState title="Nenhuma regra manual" description="A agenda automática do Kenjitsu será usada até que você adicione um ajuste." /></td></tr>}</tbody></table></div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="admin-panel-header flex-wrap items-center"><div><p className="admin-eyebrow">Exceções</p><h2 className="admin-section-title">Alterações pontuais</h2><p className="admin-section-description">Use uma exceção para mover, adicionar ou ocultar um anime em uma data específica.</p></div><span className="font-mono text-[11px] text-[var(--admin-dim)]">{state.exceptions.length} exceção(ões)</span></div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3 border border-[var(--admin-line)] bg-[var(--admin-panel-raised)] p-4">
            <p className="text-xs font-bold text-[var(--admin-text)]">{exceptionForm.id ? 'Editar exceção' : 'Adicionar exceção'}</p>
            <p className="text-[11px] text-[var(--admin-dim)]">A busca acima também seleciona o anime desta exceção.</p>
            <div className="flex items-center gap-2 border border-[var(--admin-line)] px-3 py-2 text-xs text-[var(--admin-muted)]"><Search size={14} aria-hidden="true" /><input aria-label="Pesquisar título do anime para exceção" className="min-w-0 flex-1 bg-transparent outline-none" value={catalogTarget === 'exception' ? catalogQuery : ''} onFocus={() => setCatalogTarget('exception')} onChange={(event) => { setCatalogTarget('exception'); setCatalogQuery(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCatalog(); } }} placeholder="Pesquisar título" /><button type="button" className="admin-button is-secondary shrink-0 px-2" onClick={() => { setCatalogTarget('exception'); void searchCatalog(); }} disabled={searchingCatalog || catalogQuery.trim().length < 2}>{searchingCatalog && catalogTarget === 'exception' ? <Loader2 size={15} className="animate-spin" /> : <Search size={14} />}<span className="sr-only">Pesquisar anime para exceção</span></button></div>
            {catalogTarget === 'exception' && renderCatalogResults()}
            {exceptionForm.anime && <div className="flex items-center gap-2 border border-[#FF6B00]/30 bg-[#FF6B00]/[0.06] p-2 text-xs text-[var(--admin-text)]"><span className="min-w-0 flex-1 truncate">{exceptionForm.anime.title}</span><button type="button" className="admin-icon-button" onClick={() => setExceptionForm((current) => ({ ...current, animeId: '', anime: null }))} aria-label="Limpar anime selecionado"><X size={14} /></button></div>}
            <label className="admin-field-group"><span className="admin-field-label">Data local da origem</span><input className="admin-field" type="date" value={exceptionForm.dateKey} onChange={(event) => setExceptionForm((current) => ({ ...current, dateKey: event.target.value, weekday: event.target.value ? weekdayForDateKey(event.target.value) : null }))} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Ação</span><select className="admin-field" value={exceptionForm.mode} onChange={(event) => setExceptionForm((current) => ({ ...current, mode: event.target.value as CalendarExceptionMode }))}><option value="MOVE">Substituir horário</option><option value="ADD">Adicionar nesta data</option><option value="HIDE">Ocultar nesta data</option></select></label>
            {exceptionForm.mode !== 'HIDE' && <label className="admin-field-group"><span className="admin-field-label">Horário</span><input className="admin-field" type="time" value={formatTime(exceptionForm.timeMinutes)} onChange={(event) => setExceptionForm((current) => ({ ...current, timeMinutes: parseTime(event.target.value) }))} /></label>}
            <label className="admin-field-group"><span className="admin-field-label">Fuso de origem</span><input className="admin-field" list="calendar-timezones" value={exceptionForm.timezone} onChange={(event) => setExceptionForm((current) => ({ ...current, timezone: event.target.value }))} /></label>
            <label className="admin-field-group"><span className="admin-field-label">Estado</span><select className="admin-field" value={exceptionForm.enabled ? 'on' : 'off'} onChange={(event) => setExceptionForm((current) => ({ ...current, enabled: event.target.value === 'on' }))}><option value="on">Ativa</option><option value="off">Inativa</option></select></label>
            <div className="flex flex-wrap gap-2"><button type="button" className="admin-button is-primary" onClick={upsertException}><Plus size={15} />{exceptionForm.id ? 'Atualizar exceção' : 'Adicionar exceção'}</button>{exceptionForm.id && <button type="button" className="admin-button is-ghost" onClick={() => setExceptionForm((current) => ({ ...current, id: undefined, animeId: '', anime: null }))}>Cancelar</button>}</div>
          </div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Anime</th><th>Data</th><th>Ação</th><th>Horário</th><th className="text-right">Ações</th></tr></thead><tbody>{state.exceptions.length ? state.exceptions.map((exception) => <tr key={exception.id || `${exception.animeId}-${exception.dateKey}`}><td><strong className="block max-w-48 truncate text-[var(--admin-text)]">{exception.anime.title}</strong></td><td className="font-mono-data">{exception.dateKey}</td><td>{modeLabel(exception.mode)}</td><td>{exception.mode === 'HIDE' ? '—' : formatTime(exception.timeMinutes)}</td><td><div className="flex justify-end gap-1"><button type="button" className="admin-button is-ghost px-2" onClick={() => editException(exception)} aria-label={`Editar exceção de ${exception.anime.title}`}><Eye size={14} /></button><button type="button" className="admin-button is-danger px-2" onClick={() => void removeException(exception)} aria-label={`Remover exceção de ${exception.anime.title}`}><Trash2 size={14} /></button></div></td></tr>) : <tr><td colSpan={5}><AdminEmptyState title="Nenhuma exceção" description="Alterações pontuais aparecerão nesta lista." /></td></tr>}</tbody></table></div>
        </div>
      </AdminPanel>

      <AdminSaveBar dirty={dirty} saving={saving} onSave={() => void save()} onDiscard={discard} label="Há alterações locais no calendário" />
    </div>
  );
}
