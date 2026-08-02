'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Play,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Power,
  Tv,
  Film,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirmation } from '@/context/ConfirmationContext';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface EpisodeSourcesModalProps {
  isOpen: boolean;
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  seasonNumber: number;
  episodeTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SourceRecord {
  id: string;
  provider: string;
  url: string; // url real ou decrypted
  type: string;
  quality?: string;
  audioLanguage?: string;
  enabled: boolean;
}

interface DiscoveredCandidate {
  provider: string;
  url: string;
  type: string;
  quality: string;
  audioLanguage: string;
}

export function EpisodeSourcesModal({
  isOpen,
  animeId,
  episodeId,
  episodeNumber,
  seasonNumber,
  episodeTitle,
  onClose,
  onSuccess,
}: EpisodeSourcesModalProps) {
  const { panelRef, titleId } = useDialogAccessibility(isOpen, onClose);
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [activeTab, setActiveTab] = useState<'registered' | 'discover'>('registered');

  // Registros legados mantidos apenas para inspeção/manutenção.
  const [registeredSources, setRegisteredSources] = useState<SourceRecord[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(true);

  // Consulta live
  const [discovering, setDiscovering] = useState(false);
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);

  // Player de Teste Inline Modal
  const [testingStream, setTestingStream] = useState<{
    url: string;
    type: string;
    provider: string;
  } | null>(null);
  const closeTestingStream = useCallback(() => setTestingStream(null), []);
  const { panelRef: testPanelRef, titleId: testTitleId } = useDialogAccessibility(Boolean(testingStream), closeTestingStream);

  // Carregar registros legados
  const loadSources = useCallback(async () => {
    setLoadingRegistered(true);
    try {
      const res = await fetch(`/api/admin/animes/${animeId}`);
      const data = await res.json();
      if (res.ok && data.anime) {
        const ep = (data.anime.episodes || []).find((e: any) => e.id === episodeId);
        if (ep && Array.isArray(ep.sources)) {
          setRegisteredSources(
            ep.sources.map((s: any) => ({
              id: s.id,
              provider: s.provider,
              url: s.urlEncrypted || s.url || '',
              type: s.type || 'hls',
              quality: s.quality || 'Auto',
              audioLanguage: s.audioLanguage || 'ja',
              enabled: Boolean(s.enabled),
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegistered(false);
    }
  }, [animeId, episodeId]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => void loadSources(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, loadSources]);

  // Manter o status de um registro legado.
  const handleToggleEnabled = async (sourceId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/episodes/${episodeId}/sources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, enabled: !currentStatus }),
      });
      if (res.ok) {
        setRegisteredSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, enabled: !currentStatus } : s))
        );
        showToast({
          type: 'success',
          title: 'Status Alterado',
          message: `Registro legado ${!currentStatus ? 'ATIVADO' : 'DESATIVADO'} com sucesso!`,
        });
      }
    } catch {
      showToast({ type: 'error', title: 'Erro', message: 'Falha ao alterar o registro legado.' });
    }
  };

  // Excluir registro legado
  const handleDeleteSource = async (sourceId: string, providerName: string) => {
    const confirmed = await confirm({
      title: 'Excluir registro legado do episódio?',
      description: `O registro “${providerName}” será removido deste episódio.`,
      confirmText: 'Excluir registro',
      cancelText: 'Manter registro',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(
        `/api/admin/animes/${animeId}/episodes/${episodeId}/sources?sourceId=${sourceId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setRegisteredSources((prev) => prev.filter((s) => s.id !== sourceId));
        showToast({ type: 'success', title: 'Registro excluído', message: 'Registro legado removido do episódio.' });
        onSuccess();
      }
    } catch {
      showToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir o registro legado.' });
    }
  };

  // Consultar extensões Kenjitsu em tempo real.
  const handleDiscoverSources = async () => {
    setDiscovering(true);
    setCandidates([]);
    try {
      const res = await fetch(
        `/api/admin/animes/${animeId}/episodes/${episodeId}/discover-sources`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.candidates)) {
        setCandidates(
          data.candidates.map((c: any) => ({ ...c }))
        );
        showToast({
          type: 'success',
          title: 'Consulta concluída',
          message: `${data.candidates.length} mídias candidatas encontradas!`,
        });
      } else {
        showToast({ type: 'warning', title: 'Nenhuma mídia encontrada', message: 'Nenhuma extensão retornou mídia ativa.' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro de consulta', message: err.message });
    } finally {
      setDiscovering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-4xl glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl bg-[#0F0F17] space-y-6 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
              <Tv size={24} />
            </div>
            <div>
              <h3 id={titleId} className="text-xl font-black text-white">
                Mídia: Temp {seasonNumber} Ep {episodeNumber}
              </h3>
              <p className="text-xs text-gray-400">
                {episodeTitle || `Episódio ${episodeNumber}`} • Consulte e teste mídias retornadas pelo Kenjitsu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar mídia do episódio"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas da Modal */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('registered')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border ${
              activeTab === 'registered'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/20'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
          >
            <Film size={14} />
            <span>Registros legados ({registeredSources.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('discover');
              if (candidates.length === 0) handleDiscoverSources();
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border ${
              activeTab === 'discover'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/20'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
          >
            <Sparkles size={14} />
            <span>Kenjitsu ao vivo</span>
          </button>

        </div>

        {/* Registros legados apenas para manutenção */}
        {activeTab === 'registered' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[300px]">
            {loadingRegistered ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="text-[#FF6B00] animate-spin" />
                <p className="text-xs text-gray-400">Carregando registros legados...</p>
              </div>
            ) : registeredSources.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-3">
                <AlertTriangle size={36} className="mx-auto text-amber-400 opacity-60" />
                <h4 className="text-sm font-bold text-white">Nenhum registro legado para este episódio</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Use &quot;Kenjitsu ao vivo&quot; para consultar as extensões habilitadas.
                </p>
              </div>
            ) : (
              registeredSources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{source.provider}</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-mono text-[10px]">
                        {source.type.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] font-bold text-[10px]">
                        {source.quality}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {source.audioLanguage === 'pt-BR' ? 'Dublado PT-BR' : 'Legendado JA'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-xl">
                      {source.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Botão de Testar no Player */}
                    <button
                      onClick={() =>
                        setTestingStream({
                          url: source.url,
                          type: source.type,
                          provider: source.provider,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-500/20"
                      title="Testar Reprodução em Player Inline"
                    >
                      <Play size={13} />
                      <span>Testar</span>
                    </button>

                    {/* Alternar Ativado / Desativado */}
                    <button
                      onClick={() => handleToggleEnabled(source.id, source.enabled)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                        source.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <Power size={13} />
                      <span>{source.enabled ? 'Ativado' : 'Desativado'}</span>
                    </button>

                    {/* Excluir */}
                    <button
                      onClick={() => handleDeleteSource(source.id, source.provider)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20"
                      title="Excluir registro legado"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Consulta live das extensões Kenjitsu */}
        {activeTab === 'discover' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-[300px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold">
                  Mídias candidatas ({candidates.length})
                </span>
                <button
                  onClick={handleDiscoverSources}
                  disabled={discovering}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={13} className={discovering ? 'animate-spin' : ''} />
                  <span>Reconsultar Kenjitsu</span>
                </button>
              </div>

              {discovering ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
                  <p className="text-xs font-bold text-gray-400">
                    Consultando extensoes Kenjitsu habilitadas em tempo real...
                  </p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-16 text-center text-gray-400 space-y-2">
                  <Film size={36} className="mx-auto text-gray-600" />
                  <p className="text-xs">Nenhuma mídia adicional encontrada na consulta.</p>
                </div>
              ) : (
                candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{cand.provider}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                            {cand.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono truncate max-w-lg mt-0.5">
                          {cand.url}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setTestingStream({
                          url: cand.url,
                          type: cand.type,
                          provider: cand.provider,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-all border border-emerald-500/20"
                    >
                      <Play size={12} />
                      <span>Testar</span>
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* Modal Interno de Preview do Player Inline */}
      {testingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div ref={testPanelRef} role="dialog" aria-modal="true" aria-labelledby={testTitleId} className="relative w-full max-w-4xl glass-panel border border-white/20 rounded-3xl p-6 bg-[#0B0B0F] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-[#FF6B00]" />
                <span id={testTitleId} className="font-bold text-white text-sm">
                  Testando Player: {testingStream.provider} ({testingStream.type.toUpperCase()})
                </span>
              </div>
              <button
                onClick={closeTestingStream}
                aria-label="Fechar teste do player"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
              <VideoPlayer
                playbackUrl={testingStream.url}
                animeTitle={`Teste: ${testingStream.provider}`}
                episodeNum={episodeNumber}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
