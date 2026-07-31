'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Power,
  Tv,
  Film,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirmation } from '@/context/ConfirmationContext';
import { VideoPlayer } from '@/components/player/VideoPlayer';

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
  selected?: boolean;
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
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [activeTab, setActiveTab] = useState<'registered' | 'discover' | 'manual'>('registered');

  // Fontes cadastradas
  const [registeredSources, setRegisteredSources] = useState<SourceRecord[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(true);

  // Varredura
  const [discovering, setDiscovering] = useState(false);
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);
  const [savingCandidates, setSavingCandidates] = useState(false);

  // Formulário Manual
  const [manualProvider, setManualProvider] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualType, setManualType] = useState<'hls' | 'mp4' | 'embed'>('hls');
  const [manualQuality, setManualQuality] = useState('1080p');
  const [manualAudio, setManualAudio] = useState('ja');
  const [manualEnabled, setManualEnabled] = useState(true);
  const [savingManual, setSavingManual] = useState(false);

  // Player de Teste Inline Modal
  const [testingStream, setTestingStream] = useState<{
    url: string;
    type: string;
    provider: string;
  } | null>(null);

  // Edição inline de fonte
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);

  // Carregar fontes cadastradas
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

  // Alternar Status Enabled de uma Fonte
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
          message: `Fonte ${!currentStatus ? 'ATIVADA' : 'DESATIVADA'} com sucesso!`,
        });
      }
    } catch {
      showToast({ type: 'error', title: 'Erro', message: 'Falha ao alterar status da fonte.' });
    }
  };

  // Excluir Fonte
  const handleDeleteSource = async (sourceId: string, providerName: string) => {
    const confirmed = await confirm({
      title: 'Excluir fonte do episódio?',
      description: `A fonte “${providerName}” será removida deste episódio.`,
      confirmText: 'Excluir fonte',
      cancelText: 'Manter fonte',
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
        showToast({ type: 'success', title: 'Fonte Excluída', message: 'Fonte removida do episódio.' });
        onSuccess();
      }
    } catch {
      showToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir fonte.' });
    }
  };

  // Executar Varredura em Tempo Real
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
          data.candidates.map((c: any) => ({
            ...c,
            selected: true,
          }))
        );
        showToast({
          type: 'success',
          title: 'Varredura Concluída',
          message: `${data.candidates.length} fontes candidatas encontradas!`,
        });
      } else {
        showToast({ type: 'warning', title: 'Nenhuma Fonte Encontrada', message: 'Nenhum provedor retornou mídias ativas.' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Erro de Varredura', message: err.message });
    } finally {
      setDiscovering(false);
    }
  };

  // Cadastrar Selecionadas da Varredura
  const handleSaveDiscoveredSelected = async () => {
    const selected = candidates.filter((c) => c.selected);
    if (selected.length === 0) {
      showToast({ type: 'warning', title: 'Selecione uma Fonte', message: 'Marque pelo menos uma fonte para cadastrar.' });
      return;
    }

    setSavingCandidates(true);
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/episodes/${episodeId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast({
          type: 'success',
          title: 'Fontes Cadastradas! 🎉',
          message: data.message || `${selected.length} fontes adicionadas ao episódio.`,
        });
        loadSources();
        setActiveTab('registered');
        onSuccess();
      }
    } catch {
      showToast({ type: 'error', title: 'Erro ao Salvar', message: 'Falha ao salvar fontes selecionadas.' });
    } finally {
      setSavingCandidates(false);
    }
  };

  // Salvar Nova Fonte Manual
  const handleSaveManualSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProvider.trim() || !manualUrl.trim()) {
      showToast({ type: 'warning', title: 'Campos Obrigatórios', message: 'Preencha o Nome do Provedor e a URL da Mídia.' });
      return;
    }

    setSavingManual(true);
    try {
      const res = await fetch(`/api/admin/animes/${animeId}/episodes/${episodeId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: manualProvider,
          url: manualUrl,
          type: manualType,
          quality: manualQuality,
          audioLanguage: manualAudio,
          enabled: manualEnabled,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast({
          type: 'success',
          title: 'Nova Fonte Adicionada!',
          message: `Fonte "${manualProvider}" cadastrada com sucesso.`,
        });
        setManualProvider('');
        setManualUrl('');
        loadSources();
        setActiveTab('registered');
        onSuccess();
      }
    } catch {
      showToast({ type: 'error', title: 'Erro', message: 'Falha ao cadastrar nova fonte manual.' });
    } finally {
      setSavingManual(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl bg-[#0F0F17] space-y-6 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
              <Tv size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                Fontes: Temp {seasonNumber} Ep {episodeNumber}
              </h3>
              <p className="text-xs text-gray-400">
                {episodeTitle || `Episódio ${episodeNumber}`} • Gerencie, busque e teste os servidores de streaming
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
            <span>Fontes Cadastradas ({registeredSources.length})</span>
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
            <span>Buscar em Tempo Real</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border ${
              activeTab === 'manual'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/20'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
          >
            <Plus size={14} />
            <span>Adicionar Manualmente</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Fontes Cadastradas */}
        {activeTab === 'registered' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[300px]">
            {loadingRegistered ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="text-[#FF6B00] animate-spin" />
                <p className="text-xs text-gray-400">Carregando fontes cadastradas...</p>
              </div>
            ) : registeredSources.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-3">
                <AlertTriangle size={36} className="mx-auto text-amber-400 opacity-60" />
                <h4 className="text-sm font-bold text-white">Nenhuma fonte cadastrada para este episódio</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Utilize as abas &quot;Buscar em Tempo Real&quot; para varrer os servidores ou adicione um link manualmente.
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
                      title="Excluir Fonte"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conteúdo da Aba 2: Varredura em Tempo Real */}
        {activeTab === 'discover' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-[300px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold">
                  Fontes Candidatas Encontradas ({candidates.length})
                </span>
                <button
                  onClick={handleDiscoverSources}
                  disabled={discovering}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={13} className={discovering ? 'animate-spin' : ''} />
                  <span>Re-varrer Provedores</span>
                </button>
              </div>

              {discovering ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
                  <p className="text-xs font-bold text-gray-400">
                    Sincronizando com provedores externos (AniZone, Miruro, Consumet, 2Embed)...
                  </p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-16 text-center text-gray-400 space-y-2">
                  <Film size={36} className="mx-auto text-gray-600" />
                  <p className="text-xs">Nenhuma fonte adicional encontrada na varredura.</p>
                </div>
              ) : (
                candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={Boolean(cand.selected)}
                        onChange={(e) =>
                          setCandidates((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, selected: e.target.checked } : c))
                          )
                        }
                        className="w-4 h-4 rounded border-white/20 text-[#FF6B00] focus:ring-0 cursor-pointer"
                      />
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

            {candidates.length > 0 && (
              <button
                onClick={handleSaveDiscoveredSelected}
                disabled={savingCandidates}
                className="w-full py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50 mt-4"
              >
                {savingCandidates ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Cadastrar Fontes Selecionadas ao Episódio</span>
              </button>
            )}
          </div>
        )}

        {/* Conteúdo da Aba 3: Adicionar Manualmente */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualSource} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Provedor</label>
                <input
                  type="text"
                  placeholder="Ex: AniZone HD, M3U Servidor 1, 2Embed..."
                  value={manualProvider}
                  onChange={(e) => setManualProvider(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Tipo de Stream</label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                >
                  <option value="hls">HLS (.m3u8)</option>
                  <option value="mp4">MP4 Direto (.mp4)</option>
                  <option value="embed">Embed iFrame (3rd-party)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">URL da Mídia ou Embed</label>
              <input
                type="url"
                placeholder="https://servidor.com/video.m3u8 ou https://player.com/embed/123"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Qualidade</label>
                <select
                  value={manualQuality}
                  onChange={(e) => setManualQuality(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white"
                >
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="Auto">Auto (Adaptação HLS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Idioma de Áudio</label>
                <select
                  value={manualAudio}
                  onChange={(e) => setManualAudio(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-white"
                >
                  <option value="ja">Legendado (Japonês JA)</option>
                  <option value="pt-BR">Dublado (Português PT-BR)</option>
                  <option value="en">Inglês (EN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Status Inicial</label>
                <button
                  type="button"
                  onClick={() => setManualEnabled(!manualEnabled)}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    manualEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <Power size={14} />
                  <span>{manualEnabled ? 'Ativado (Online)' : 'Desativado (Offline)'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {manualUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setTestingStream({
                      url: manualUrl,
                      type: manualType,
                      provider: manualProvider || 'Teste Manual',
                    })
                  }
                  className="px-5 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-xs flex items-center gap-2 transition-all border border-emerald-500/20"
                >
                  <Play size={15} />
                  <span>Testar no Player</span>
                </button>
              )}

              <button
                type="submit"
                disabled={savingManual}
                className="flex-1 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
              >
                {savingManual ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Salvar Nova Fonte</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal Interno de Preview do Player Inline */}
      {testingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl glass-panel border border-white/20 rounded-3xl p-6 bg-[#0B0B0F] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-[#FF6B00]" />
                <span className="font-bold text-white text-sm">
                  Testando Player: {testingStream.provider} ({testingStream.type.toUpperCase()})
                </span>
              </div>
              <button
                onClick={() => setTestingStream(null)}
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
