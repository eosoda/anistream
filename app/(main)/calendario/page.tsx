'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';
import { addDays, localWeekStart } from '@/lib/calendar/time';
import type { ReleaseScheduleCalendar } from '@/types/calendar';
import { toPlainText } from '@/utils/formatters';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function formatWeekLabel(weekStart: string, timezone: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(`${addDays(weekStart, 6)}T12:00:00Z`);
  return `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: timezone }).format(start)} — ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone }).format(end)}`;
}

export default function CalendarPage() {
  const timezone = useSyncExternalStore(() => () => undefined, browserTimezone, () => DEFAULT_TIMEZONE);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(localWeekStart(timezone), weekOffset * 7), [timezone, weekOffset]);
  const [calendar, setCalendar] = useState<ReleaseScheduleCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ timezone, weekStart });
      const response = await fetch(`/api/calendar?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível carregar o calendário.');
      setCalendar(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o calendário.');
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // O efeito sincroniza a consulta com a semana/timezone selecionados.
    void load();
    // A alteração de semana ou timezone é a única intenção deste efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, weekStart]);

  const totalItems = useMemo(() => calendar?.days.reduce((total, day) => total + day.items.length, 0) || 0, [calendar]);
  const todayWeek = timezone ? localWeekStart(timezone) : weekStart;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1600px] space-y-6 px-4 py-8 text-white sm:px-8 lg:px-10">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
            <Calendar size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF8A3D]">Release Schedule</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Calendário semanal</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Veja quando os animes devem sair, organizados pelo horário do seu dispositivo.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{timezone.replace('_', ' ')}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">{totalItems} lançamento(s)</span>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 font-semibold text-gray-300 transition hover:border-[#FF6B00]/50 hover:text-white" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{weekStart ? formatWeekLabel(weekStart, timezone) : 'Carregando semana…'}</p>
          <p className="mt-1 text-xs text-gray-500">Horários aproximados, sincronizados pelo Kenjitsu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-300 transition hover:border-[#FF6B00]/50 hover:text-white" onClick={() => setWeekOffset((current) => current - 1)} disabled={loading}>
            <ChevronLeft size={15} aria-hidden="true" /> Anterior
          </button>
          <button type="button" className="min-h-10 rounded-xl border border-[#FF6B00]/40 px-3 text-xs font-bold text-[#FF9A5B] transition hover:bg-[#FF6B00]/10" onClick={() => setWeekOffset(0)} disabled={loading}>Hoje</button>
          <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-300 transition hover:border-[#FF6B00]/50 hover:text-white" onClick={() => setWeekOffset((current) => current + 1)} disabled={loading}>
            Próxima <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100" role="alert"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
      {calendar?.warnings.length ? <div className="flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" role="status"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{calendar.warnings[0]}{calendar.warnings.length > 1 ? ` (+${calendar.warnings.length - 1} aviso(s))` : ''}</span></div> : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-7" role="status" aria-live="polite" aria-label="Carregando calendário">
          {Array.from({ length: 7 }).map((_, index) => <div key={index} className="min-h-52 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}
        </div>
      ) : calendar?.state === 'empty' && !totalItems ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-16 text-center">
          <Calendar size={26} className="mx-auto text-gray-500" aria-hidden="true" />
          <h2 className="mt-4 text-base font-bold">Nenhum lançamento nesta semana</h2>
          <p className="mt-2 text-sm text-gray-500">A agenda automática não retornou lançamentos para o período selecionado.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {calendar?.days.map((day) => (
            <section key={day.date} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <header className="border-b border-white/10 bg-white/[0.025] px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#FF8A3D] md:hidden">{day.label}</p>
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold text-white md:text-center md:text-xs md:uppercase md:tracking-wider md:text-gray-300">{day.shortLabel}</h2>
                  <time dateTime={day.date} className="text-xs text-gray-500">{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</time>
                </div>
              </header>
              <div className="divide-y divide-white/10">
                {day.items.length ? day.items.map((item) => (
                  <Link key={item.id} href={`/anime/${item.anilistId}`} className="group flex gap-3 px-3 py-3 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B00]">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {item.posterUrl ? <SafeImage src={item.posterUrl} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-[10px] text-gray-600">Sem capa</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-gray-100 group-hover:text-[#FF9A5B]">{toPlainText(item.title) || 'Anime'}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500"><Clock size={11} aria-hidden="true" /> aprox. {item.time}</span>
                    </span>
                  </Link>
                )) : <p className="px-3 py-5 text-xs text-gray-600">Nenhum lançamento</p>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
