'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { formatOpeningTime, parseOpeningTime } from '@/lib/openings/time';

type PreviewItem = {
  episodeId: string;
  episodeNumber: number;
  found: boolean;
  openingStartSeconds?: number;
  openingEndSeconds?: number;
  error?: string;
};

type EditableItem = PreviewItem & {
  selected: boolean;
  startText: string;
  endText: string;
};

interface OpeningImportModalProps {
  animeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onMessage: (type: 'success' | 'error', message: string) => void;
}

export function OpeningImportModal({ animeId, isOpen, onClose, onSaved, onMessage }: OpeningImportModalProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
        setItems([]);
      }
    });

    fetch(`/api/admin/animes/${animeId}/openings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview' }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Não foi possível consultar a AniSkip.');
        if (!cancelled) {
          setItems(
            payload.results.map((item: PreviewItem) => ({
              ...item,
              selected: item.found,
              startText: formatOpeningTime(item.openingStartSeconds),
              endText: formatOpeningTime(item.openingEndSeconds),
            }))
          );
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Falha ao consultar a AniSkip.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [animeId, isOpen]);

  if (!isOpen) return null;

  const foundCount = items.filter((item) => item.found).length;
  const selectedItems = items.filter((item) => item.found && item.selected);

  const handleSave = async () => {
    const episodes = selectedItems.map((item) => ({
      episodeId: item.episodeId,
      openingStartSeconds: parseOpeningTime(item.startText),
      openingEndSeconds: parseOpeningTime(item.endText),
    }));
    const invalid = episodes.some((item) => item.openingStartSeconds == null || item.openingEndSeconds == null || item.openingEndSeconds <= item.openingStartSeconds);
    if (invalid) {
      setLoadError('Revise os horários selecionados. O fim deve ser posterior ao início.');
      return;
    }

    setSaving(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/animes/${animeId}/openings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', episodes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar as aberturas.');
      await onSaved();
      onMessage('success', `${payload.updatedCount} abertura(s) importada(s) e revisada(s).`);
      onClose();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Falha ao salvar as aberturas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="opening-import-title">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#121219] shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="opening-import-title" className="text-base font-bold text-white">
              Revisar horários da AniSkip
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Nada é salvo automaticamente. Selecione e ajuste os intervalos antes de confirmar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar importação"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-48 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-zinc-300">
              <Loader2 className="animate-spin text-[#FF6B00]" size={28} />
              Consultando episódios em lotes seguros…
            </div>
          ) : loadError && items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-md text-sm text-red-300">{loadError}</p>
              <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-zinc-300">
                  <strong className="text-white">{foundCount}</strong> encontrados · {items.length - foundCount} sem marcação
                </span>
                <span className="text-zinc-400">{selectedItems.length} selecionados</span>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.episodeId}
                    className={`grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl px-3 py-3 sm:grid-cols-[auto_90px_1fr_1fr] ${item.found ? 'bg-white/[0.05]' : 'bg-white/[0.025]'}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Importar abertura do episódio ${item.episodeNumber}`}
                      checked={item.selected}
                      disabled={!item.found}
                      onChange={(event) => setItems((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, selected: event.target.checked } : entry)))}
                      className="size-4 accent-[#FF6B00]"
                    />
                    <span className="text-xs font-bold text-white">EP {item.episodeNumber}</span>
                    {item.found ? (
                      <>
                        <label className="text-[11px] text-zinc-400">
                          Início
                          <input
                            value={item.startText}
                            onChange={(event) => setItems((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, startText: event.target.value } : entry)))}
                            className="mt-1 w-full rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none ring-1 ring-white/10 focus:ring-[#FF6B00]"
                          />
                        </label>
                        <label className="text-[11px] text-zinc-400">
                          Fim
                          <input
                            value={item.endText}
                            onChange={(event) => setItems((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, endText: event.target.value } : entry)))}
                            className="mt-1 w-full rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none ring-1 ring-white/10 focus:ring-[#FF6B00]"
                          />
                        </label>
                      </>
                    ) : (
                      <span className="col-span-2 text-[11px] text-zinc-500">{item.error || 'Sem informação disponível'}</span>
                    )}
                  </div>
                ))}
              </div>
              {loadError && <p className="mt-3 text-xs text-red-300">{loadError}</p>}
            </>
          )}
        </div>

        {!loading && items.length > 0 && (
          <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-4 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedItems.length === 0}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-[#FF6B00] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#FF7A1A] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Salvar selecionados
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
