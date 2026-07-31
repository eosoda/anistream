'use client';

import React, { useState } from 'react';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  Bell,
  BellRing,
  BellOff,
  Settings2,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Tv,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { JikanAnime } from '@/types/anime';

import { useFavorites } from '@/hooks/useFavorites';
import { Tooltip } from '@/components/ui/Tooltip';

const REMINDERS_CONFIG_KEY = 'anistream_reminders_config_v1';

export interface ReminderConfig {
  globalEnabled: boolean;
  timing: 'exact' | '1h_before' | '1d_before';
  disabledAnimeIds: number[];
}

const DEFAULT_CONFIG: ReminderConfig = {
  globalEnabled: true,
  timing: 'exact',
  disabledAnimeIds: [],
};

interface EpisodeRemindersPanelProps {
  favorites: JikanAnime[];
}

export function isFinishedAnime(anime: JikanAnime) {
  const status = anime.status?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ?? '';
  return (
    status.includes('finished airing') ||
    status.includes('finished') ||
    status.includes('completed') ||
    status.includes('concluido') ||
    status.includes('finalizado')
  );
}

export function EpisodeRemindersPanel({ favorites }: EpisodeRemindersPanelProps) {
  const { newEpisodesMap } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    'granted' | 'denied' | 'default' | 'unsupported'
  >(() => {
    if (typeof window === 'undefined') return 'default';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const [config, setConfig] = useState<ReminderConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem(REMINDERS_CONFIG_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const saveConfig = (newConfig: ReminderConfig) => {
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REMINDERS_CONFIG_KEY, JSON.stringify(newConfig));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Seu navegador não suporta notificações de área de trabalho.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast('Notificações ativadas com sucesso!');
        // Trigger welcome test
        new Notification('AniStream - Notificações Ativadas!', {
          body: 'Você receberá lembretes quando novos episódios dos seus animes favoritos forem lançados.',
          icon: '/favicon.ico',
        });
      } else if (permission === 'denied') {
        showToast('Permissão de notificação foi negada no navegador.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const sendTestNotification = (animeTitle?: string) => {
    if (notificationPermission !== 'granted') {
      requestPermission();
      return;
    }

    const title = animeTitle
      ? `Novo Episódio: ${animeTitle}`
      : 'AniStream - Teste de Lembrete';
    const body = animeTitle
      ? `O episódio mais recente de "${animeTitle}" já está disponível para assistir!`
      : 'O sistema de lembretes de novos episódios está funcionando perfeitamente.';

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      showToast('Notificação enviada!');
    } catch (e) {
      console.error('Failed to dispatch notification', e);
      showToast('Erro ao disparar notificação local.');
    }
  };

  const toggleAnimeReminder = (malId: number) => {
    const isCurrentlyDisabled = config.disabledAnimeIds.includes(malId);
    let updatedDisabled: number[];

    if (isCurrentlyDisabled) {
      updatedDisabled = config.disabledAnimeIds.filter((id) => id !== malId);
      showToast('Lembrete ativado para este anime.');
    } else {
      updatedDisabled = [...config.disabledAnimeIds, malId];
      showToast('Lembrete desativado para este anime.');
    }

    saveConfig({ ...config, disabledAnimeIds: updatedDisabled });
  };

  const reminderFavorites = favorites.filter((anime) => !isFinishedAnime(anime));
  const airingFavorites = reminderFavorites.filter((anime) => anime.airing);

  return (
    <div className="w-full space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2.5 rounded-2xl glass-panel bg-neutral-900/95 border border-[#FF6B00] text-white text-xs font-bold shadow-2xl backdrop-blur-xl animate-fade-in flex items-center gap-2">
          <Sparkles size={16} className="text-[#FF6B00]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Bar Button */}
      <div className="p-4 rounded-3xl glass-panel bg-neutral-900/80 border border-white/10 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 flex-shrink-0">
            {config.globalEnabled && notificationPermission === 'granted' ? (
              <BellRing size={22} className="animate-pulse" />
            ) : (
              <BellOff size={22} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Lembretes de Novos Episódios
              </h3>
              {notificationPermission === 'granted' && config.globalEnabled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Receba notificações no navegador quando novos episódios dos seus favoritos forem lançados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF6B00] hover:bg-[#FF8533] text-white transition-all shadow-md shadow-[#FF6B00]/30 flex items-center gap-1.5"
            >
              <Bell size={14} />
              <span>Permitir Notificações</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all flex items-center gap-1.5"
          >
            <Settings2 size={14} />
            <span>Configurações</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Settings Panel */}
      {isOpen && (
        <div className="p-5 rounded-3xl glass-panel bg-neutral-900/95 border border-white/10 shadow-2xl space-y-6 animate-fade-in">
          {/* Permission Status Banner */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle
                size={16}
                className={
                  notificationPermission === 'granted'
                    ? 'text-emerald-400'
                    : notificationPermission === 'denied'
                    ? 'text-red-400'
                    : 'text-amber-400'
                }
              />
              <span className="text-gray-300 font-semibold">
                Status das Notificações do Navegador:{' '}
                <strong className="text-white uppercase font-bold">
                  {notificationPermission === 'granted'
                    ? 'Permitido'
                    : notificationPermission === 'denied'
                    ? 'Bloqueado no Navegador'
                    : notificationPermission === 'unsupported'
                    ? 'Não Suportado'
                    : 'Pendente de Permissão'}
                </strong>
              </span>
            </div>

            <button
              onClick={() => sendTestNotification()}
              disabled={notificationPermission !== 'granted'}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                notificationPermission === 'granted'
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <Send size={13} />
              <span>Enviar Notificação de Teste</span>
            </button>
          </div>

          {/* Master Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Switch */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notificações de Lançamento
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Ativar ou pausar todos os lembretes de episódios
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  saveConfig({ ...config, globalEnabled: !config.globalEnabled })
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.globalEnabled ? 'bg-[#FF6B00]' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.globalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Timing Selector */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-[#FF6B00]" />
                <span>Antecedência do Lembrete</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                {[
                  { id: 'exact', label: 'No Lançamento' },
                  { id: '1h_before', label: '1 Horas Antes' },
                  { id: '1d_before', label: '24 Horas Antes' },
                ].map((opt) => {
                  const isSelected = config.timing === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        saveConfig({ ...config, timing: opt.id as any })
                      }
                      className={`px-2.5 py-1.5 rounded-xl transition-all border text-center ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm shadow-[#FF6B00]/30'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Per-Anime Reminders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                <Tv size={14} />
                <span>Lembretes Individuais por Anime ({reminderFavorites.length})</span>
              </h4>

              {airingFavorites.length > 0 && (
                <span className="text-[11px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {airingFavorites.length} em exibição
                </span>
              )}
            </div>

            {reminderFavorites.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                {favorites.length === 0
                  ? 'Você ainda não possui animes favoritados para configurar lembretes.'
                  : 'Seus animes favoritos já foram concluídos e não precisam de lembretes.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {reminderFavorites.map((anime) => {
                  const isDisabled = config.disabledAnimeIds.includes(anime.mal_id);
                  const isAiring = anime.airing;
                  const epInfo = newEpisodesMap[anime.mal_id];
                  const hasNewEp = epInfo?.hasNewEpisode;

                  return (
                    <div
                      key={anime.mal_id}
                      className={`p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border transition-all flex items-center justify-between gap-3 text-xs ${
                        hasNewEp ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {anime.images?.jpg?.image_url && (
                          <SafeImage
                            src={anime.images.jpg.image_url}
                            animeId={anime.mal_id}
                            alt={anime.title}
                            width={36}
                            height={44}
                            className="w-9 h-11 object-cover rounded-xl border border-white/10 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white truncate text-xs">
                              {anime.title}
                            </h5>
                            {hasNewEp && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500 text-black flex items-center gap-0.5 flex-shrink-0 animate-pulse">
                                <Sparkles size={10} />
                                <span>{epInfo?.latestEpisodeNum ? `EP ${epInfo.latestEpisodeNum}` : 'NOVO'}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                isAiring
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {isAiring ? 'Em Exibição' : 'Em Breve'}
                            </span>
                            {anime.broadcast?.string && (
                              <span className="truncate hidden sm:inline">
                                {anime.broadcast.string}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Tooltip content="Simular notificação deste anime" position="left">
                          <button
                            type="button"
                            onClick={() => sendTestNotification(anime.title)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-[11px] transition-colors border border-white/10 flex items-center gap-1"
                          >
                            <Send size={12} className="text-[#FF6B00]" />
                            <span className="hidden md:inline">Testar</span>
                          </button>
                        </Tooltip>

                        <button
                          type="button"
                          onClick={() => toggleAnimeReminder(anime.mal_id)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all border flex items-center gap-1.5 ${
                            !isDisabled
                              ? 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/40'
                              : 'bg-white/5 text-gray-500 border-white/5'
                          }`}
                        >
                          {!isDisabled ? (
                            <>
                              <Check size={13} />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <span>Pausado</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
