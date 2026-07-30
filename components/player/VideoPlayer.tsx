'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  CheckCircle2,
  Server,
  ChevronRight,
  ChevronLeft,
  Clock,
  Film,
  Languages,
  Captions,
  Keyboard,
  X,
  PictureInPicture2,
  FastForward,
  Moon,
  Sun,
  AlertTriangle,
} from 'lucide-react';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useToast } from '@/context/ToastContext';
import { SafeImage } from '@/components/ui/SafeImage';
import { Tooltip } from '@/components/ui/Tooltip';
import { ReportProblemModal } from '@/components/player/ReportProblemModal';

export interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
}

export interface ResolvedSubTrack {
  id: string;
  language: string;
  label: string;
  format?: string;
  url?: string;
}

interface ResolvedAlternative {
  sourceId: string;
  provider: string;
  type?: string;
  quality?: string;
  audioLanguage?: string;
  playbackUrl: string;
}

interface ResolvedStream {
  playbackUrl: string;
  provider?: string;
  type?: string;
  quality?: string;
  audioLanguage?: string;
  subtitles?: ResolvedSubTrack[];
  alternatives?: ResolvedAlternative[];
}

export interface VideoPlayerProps {
  animeId?: number;
  animeTitle?: string;
  animeImage?: string;
  episodeNum?: number;
  episodeTitle?: string;
  nextEpNum?: number | null;
  playbackUrl?: string;
  resolvedStream?: ResolvedStream | null;
  streamStatusMessage?: string | null;
  onNextEpisode?: () => void;
}

const AUDIO_LANGUAGES = [
  { id: 'ja', name: 'Japonês', label: 'Japonês (Original)', code: 'JP', badge: 'LEG' },
  { id: 'pt', name: 'Português', label: 'Português (Brasil)', code: 'PT-BR', badge: 'DUB' },
  { id: 'en', name: 'Inglês', label: 'Inglês (English)', code: 'EN', badge: 'DUB' },
  { id: 'es', name: 'Espanhol', label: 'Espanhol (Español)', code: 'ES', badge: 'DUB' },
];

export function VideoPlayer({
  animeId = 0,
  animeTitle = '',
  animeImage,
  episodeNum = 1,
  episodeTitle,
  nextEpNum,
  playbackUrl,
  resolvedStream,
  streamStatusMessage,
  onNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<InstanceType<typeof Hls> | null>(null);
  const retryCountRef = useRef<number>(0);

  const { saveProgress, getProgress } = useWatchProgress();
  const { showToast } = useToast();
  const prefetchedRef = useRef<boolean>(false);

  // Construir a lista de servidores combinando resolvedStream/playbackUrl e alternativas
  const serverList = React.useMemo(() => {
    const effectiveStream = resolvedStream || (playbackUrl ? { playbackUrl, provider: 'Fonte de Teste', type: playbackUrl.includes('.m3u8') ? 'hls' : 'mp4' } : null);

    if (effectiveStream?.playbackUrl) {
      const mainServer = {
        id: 'main-stream',
        name: `${effectiveStream.provider || 'Fonte 1'} (${effectiveStream.quality || 'Auto'})`,
        type: effectiveStream.type || 'hls',
        src: effectiveStream.playbackUrl,
      };

      const altServers = (effectiveStream.alternatives || []).map((alt, idx) => ({
        id: alt.sourceId || `alt-${idx}`,
        name: `${alt.provider || 'Fonte ' + (idx + 2)} (${alt.quality || 'Auto'})`,
        type: alt.type || effectiveStream.type || 'hls',
        src: alt.playbackUrl,
      }));

      return [mainServer, ...altServers];
    }

    return [];
  }, [resolvedStream, playbackUrl]);

  const [activeServer, setActiveServer] = useState(serverList[0]);

  useEffect(() => {
    if (serverList.length > 0) {
      setActiveServer(serverList[0]);
    }
  }, [serverList]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLightDimmed, setIsLightDimmed] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Settings Popover State
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'audio-sub' | 'speed'>('main');

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Subtitles extraídas da API ou vazias
  const availableSubtitles = React.useMemo(() => {
    return resolvedStream?.subtitles || [];
  }, [resolvedStream]);

  const [selectedSubTrack, setSelectedSubTrack] = useState<ResolvedSubTrack | null>(
    availableSubtitles.length > 0 ? availableSubtitles[0] : null
  );

  useEffect(() => {
    if (availableSubtitles.length > 0) {
      setSelectedSubTrack(availableSubtitles[0]);
    } else {
      setSelectedSubTrack(null);
    }
  }, [availableSubtitles]);

  const failedServerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    failedServerIdsRef.current.clear();
  }, [animeId, episodeNum, resolvedStream]);

  // Fallback automático com auditoria de erros e prevenção de loops infinitos de retentativa
  const handleVideoError = useCallback((customReason?: string) => {
    if (!serverList || serverList.length <= 1) {
      return;
    }

    const errCode = videoRef.current?.error?.code;
    let errorDetail = customReason || 'Servidor instável ou inacessível';

    if (errCode === 1) errorDetail = 'Download da mídia foi abortado';
    if (errCode === 2) errorDetail = 'Erro de conexão de rede com o vídeo';
    if (errCode === 3) errorDetail = 'Erro de decodificação do codec de vídeo';
    if (errCode === 4) errorDetail = 'Formato de vídeo não suportado pelo navegador';

    if (activeServer?.id) {
      failedServerIdsRef.current.add(activeServer.id);
    }

    const unfailedServer = serverList.find((s) => !failedServerIdsRef.current.has(s.id));

    if (unfailedServer && unfailedServer.id !== activeServer?.id) {
      setActiveServer(unfailedServer);
      showToast({
        type: 'warning',
        title: 'Alternando Servidor (Fallback)',
        message: `${errorDetail}. Carregando ${unfailedServer.name}...`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Falha de Transmissão',
        message: `${errorDetail}. Todas as fontes disponíveis falharam.`,
      });
    }
  }, [activeServer, serverList, showToast]);

  // Carregamento dinâmico do HLS.js para streams .m3u8 com fallback nativo MP4
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !activeServer?.src) return;

    retryCountRef.current = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const srcUrl = activeServer.src;
    const isHls = activeServer.type === 'hls' || srcUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(srcUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) {
          videoEl.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event: string, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < 2) {
                retryCountRef.current += 1;
                hls.startLoad();
              } else {
                handleVideoError('Falha contínua de conexão com servidor CDN');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCountRef.current < 2) {
                retryCountRef.current += 1;
                hls.recoverMediaError();
              } else {
                handleVideoError('Formato de fluxo de vídeo corrompido');
              }
              break;
            default:
              handleVideoError('Erro fatal na transmissão HLS');
              break;
          }
        }
      });
    } else {
      videoEl.src = srcUrl;
      if (isPlaying) {
        videoEl.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, handleVideoError, isPlaying]);

  // Picture-in-Picture event listeners
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);

    videoEl.addEventListener('enterpictureinpicture', onEnterPip);
    videoEl.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      videoEl.removeEventListener('enterpictureinpicture', onEnterPip);
      videoEl.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      } else {
        showToast({
          type: 'warning',
          title: 'PiP Indisponível',
          message: 'Seu navegador não suporta Picture-in-Picture nativo.',
        });
      }
    } catch (err) {
      console.error('Error toggling PiP:', err);
    }
  };

  const skipIntro = useCallback(() => {
    if (!videoRef.current) return;
    const dur = duration || videoRef.current.duration || 1000;
    const newTime = Math.min(videoRef.current.currentTime + 85, dur);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showToast({
      type: 'info',
      title: 'Abertura Pulada (+85s)',
      duration: 2000,
    });
  }, [duration, showToast]);

  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (autoplayCountdown === null) return;

    if (autoplayCountdown <= 0) {
      setAutoplayCountdown(null);
      if (onNextEpisode) {
        onNextEpisode();
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoplayCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoplayCountdown, onNextEpisode]);

  const handleEpisodeCompletion = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const dur = videoRef.current?.duration || duration || 100;
    saveProgress({
      animeId,
      animeTitle,
      animeImage,
      episodeNum,
      episodeTitle,
      currentTime: dur,
      duration: dur,
    });

    showToast({
      type: 'success',
      title: `Episódio ${episodeNum} Concluído!`,
      message: `Salvo em Continuar Assistindo.`,
      animeImage,
      animeId,
    });

    setShowSettingsMenu(false);

    if (nextEpNum && onNextEpisode) {
      setAutoplayCountdown(5);
    }
  };

  const [audioLang, setAudioLang] = useState(AUDIO_LANGUAGES[0]);
  const [langToast, setLangToast] = useState<string | null>(null);

  const handleAudioChange = (lang: (typeof AUDIO_LANGUAGES)[0]) => {
    setAudioLang(lang);
    setLangToast(`Áudio: ${lang.label}`);
    setTimeout(() => setLangToast(null), 2500);
  };

  const [resumePrompt, setResumePrompt] = useState<{
    show: boolean;
    time: number;
  }>({ show: false, time: 0 });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hrs > 0) {
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      const saved = getProgress(animeId, episodeNum);
      if (saved && saved.currentTime > 10 && saved.percentage < 92) {
        videoRef.current.currentTime = saved.currentTime;
        setCurrentTime(saved.currentTime);
        setResumePrompt({
          show: true,
          time: saved.currentTime,
        });
        showToast({
          type: 'info',
          title: `Vídeo Retomado (${formatTime(saved.currentTime)})`,
          message: 'Retomado automaticamente do ponto salvo.',
          duration: 4000,
        });
      } else {
        setResumePrompt({ show: false, time: 0 });
      }
    }
  };

  useEffect(() => {
    prefetchedRef.current = false;
  }, [animeId, episodeNum, activeServer]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(curr);

    // Pre-fetch proativo do próximo episódio quando a reprodução passar de 88%
    if (dur > 0 && curr / dur >= 0.88 && !prefetchedRef.current && nextEpNum && animeId) {
      prefetchedRef.current = true;
      fetch(`/api/anime/${animeId}/episodes/${nextEpNum}`).catch(() => {});
    }

    if (dur > 0 && Math.floor(curr) % 3 === 0) {
      saveProgress({
        animeId,
        animeTitle,
        animeImage,
        episodeNum,
        episodeTitle,
        currentTime: curr,
        duration: dur,
      });
    }
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      saveProgress({
        animeId,
        animeTitle,
        animeImage,
        episodeNum,
        episodeTitle,
        currentTime: videoRef.current.currentTime,
        duration: videoRef.current.duration || duration,
      });
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      if (resumePrompt.show) {
        setResumePrompt((prev) => ({ ...prev, show: false }));
      }
    }
  }, [isPlaying, saveProgress, animeId, animeTitle, animeImage, episodeNum, episodeTitle, duration, resumePrompt.show]);

  const handleResume = (resumeTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = resumeTime;
      setCurrentTime(resumeTime);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setResumePrompt({ show: false, time: 0 });
  };

  const handleStartOver = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    setResumePrompt({ show: false, time: 0 });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      saveProgress({
        animeId,
        animeTitle,
        animeImage,
        episodeNum,
        episodeTitle,
        currentTime: targetTime,
        duration: videoRef.current.duration || duration,
      });
    }
  };

  const skipTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  }, [isMuted]);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setSettingsTab('main');
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'Escape') {
        if (showSettingsMenu) {
          setShowSettingsMenu(false);
          e.preventDefault();
        } else if (showShortcutsModal) {
          setShowShortcutsModal(false);
          e.preventDefault();
        } else if (isTheaterMode) {
          setIsTheaterMode(false);
          e.preventDefault();
        } else if (isLightDimmed) {
          setIsLightDimmed(false);
          e.preventDefault();
        }
        return;
      }

      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        setShowShortcutsModal((prev) => !prev);
        e.preventDefault();
        return;
      }

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        togglePlay();
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S') {
        skipIntro();
        e.preventDefault();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        e.preventDefault();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        e.preventDefault();
      } else if (e.key === 'c' || e.key === 'C') {
        setIsTheaterMode((prev) => !prev);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        skipTime(-10);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        skipTime(10);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        if (videoRef.current) {
          const newVol = Math.min(1, (videoRef.current.volume || volume) + 0.1);
          setVolume(newVol);
          videoRef.current.volume = newVol;
          setIsMuted(newVol === 0);
        }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (videoRef.current) {
          const newVol = Math.max(0, (videoRef.current.volume || volume) - 0.1);
          setVolume(newVol);
          videoRef.current.volume = newVol;
          setIsMuted(newVol === 0);
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheaterMode, showSettingsMenu, showShortcutsModal, volume, isPlaying, duration, togglePlay, toggleFullscreen, toggleMute, skipTime, skipIntro]);

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Servidores Dinâmica */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-panel border border-white/10 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="flex items-center gap-1.5 text-gray-300 font-bold whitespace-nowrap flex-shrink-0 mr-1">
            <Server size={15} className="text-[#FF6B00]" />
            <span>Servidor:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {serverList.map((server) => {
              const isActive = activeServer.id === server.id;
              return (
                <button
                  key={server.id}
                  onClick={() => {
                    setActiveServer(server);
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap text-xs ${
                    isActive
                      ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  {isActive && <CheckCircle2 size={12} />}
                  {server.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dark Backdrop para Modo Cinema / Apagar Luzes */}
      {(isTheaterMode || isLightDimmed) && (
        <div
          onClick={() => {
            setIsTheaterMode(false);
            setIsLightDimmed(false);
          }}
          className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in"
        />
      )}

      {/* Container Principal do Player com Ambient Glow */}
      <div className="relative group/player-wrapper">
        {/* Glow de Iluminação Ambiente */}
        <div
          className={`absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#FF6B00]/25 via-amber-500/20 to-purple-600/20 blur-2xl transition-opacity duration-700 pointer-events-none -z-10 ${
            isPlaying || isTheaterMode ? 'opacity-80 animate-pulse' : 'opacity-30'
          }`}
        />

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onTouchStart={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className={`relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border-2 bg-black group select-none transition-all duration-300 ${
            isTheaterMode
              ? 'fixed inset-x-1 sm:inset-x-6 top-1/2 -translate-y-1/2 z-50 max-w-7xl mx-auto shadow-2xl shadow-[#FF6B00]/40 border-[#FF6B00]/60 ring-4 ring-[#FF6B00]/20'
              : 'border-white/10 shadow-2xl'
          }`}
        >
        {/* Banner Informativo de Status quando não houver fontes reais */}
        {streamStatusMessage && (
          <div className="absolute top-4 left-4 z-30 px-3.5 py-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold backdrop-blur-md flex items-center gap-2 shadow-2xl animate-fade-in">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <span>{streamStatusMessage} (Exibindo reprodução de demonstração)</span>
          </div>
        )}

        {/* Elemento de Vídeo ou iFrame Embed */}
        {activeServer?.type === 'embed' ? (
          <iframe
            src={activeServer.src}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <video
            ref={videoRef}
            poster={animeImage}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEpisodeCompletion}
            onError={() => handleVideoError()}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />
        )}

        {/* Pill Flutuante sobre o Vídeo: Pular Abertura (+85s) */}
        {(showControls || !isPlaying) && (
          <button
            onClick={skipIntro}
            className="absolute bottom-16 right-4 sm:bottom-20 sm:right-6 z-30 px-3.5 py-2 rounded-2xl bg-black/75 hover:bg-[#FF6B00] border border-[#FF6B00]/40 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
            title="Pular Abertura (+85s) - Tecla S"
          >
            <FastForward size={14} className="text-[#FF6B00] group-hover:text-white" />
            <span>Pular Abertura (+85s)</span>
          </button>
        )}

        {/* Card Flutuante de Autoplay / Próximo Episódio */}
        {autoplayCountdown !== null && (
          <div className="absolute bottom-16 right-4 sm:bottom-20 sm:right-6 z-40 max-w-xs w-full p-4 rounded-2xl glass-panel bg-neutral-900/95 border-2 border-[#FF6B00] shadow-2xl backdrop-blur-xl animate-fade-in text-white select-none">
            <div className="flex items-center gap-3">
              {animeImage && (
                <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/10">
                  <SafeImage src={animeImage} animeId={animeId} alt={animeTitle} fill className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#FF6B00] uppercase tracking-wider">Próximo Episódio</span>
                  <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-black text-xs animate-pulse shadow-md">
                    {autoplayCountdown}s
                  </span>
                </div>
                <h4 className="text-xs font-black text-white truncate mt-0.5">
                  Episódio {nextEpNum}
                </h4>
                <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                  {animeTitle}
                </p>
              </div>
            </div>

            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden my-2.5">
              <div
                className="h-full bg-[#FF6B00] transition-all duration-1000 ease-linear shadow-sm"
                style={{ width: `${(autoplayCountdown / 5) * 100}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAutoplayCountdown(null);
                  if (onNextEpisode) onNextEpisode();
                }}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow-md shadow-[#FF6B00]/30 transition-all text-center flex items-center justify-center gap-1"
              >
                <span>Assistir Agora</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setAutoplayCountdown(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs border border-white/10 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Atalhos de Teclado */}
        {showShortcutsModal && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center text-white animate-fade-in select-none">
            <div className="relative w-full max-w-md p-5 rounded-2xl glass-panel bg-neutral-900/95 border border-[#FF6B00]/40 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
                    <Keyboard size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wider">Atalhos do Teclado</h3>
                    <p className="text-[11px] text-gray-400 font-semibold">Controles rápidos do player</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Play / Pausa</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">Espaço / K</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Tela Cheia</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">F</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Ativar / Desativar Som</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">M</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Modo Cinema</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">C</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Voltar / Avançar 10s</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">◄  ►</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Pular Abertura (+85s)</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">S</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-gray-300 font-bold">Ajustar Volume</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">▲  ▼</kbd>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 sm:col-span-2">
                  <span className="text-gray-300 font-bold">Abrir Atalhos de Teclado</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 border border-white/20 font-mono text-[10px] text-[#FF6B00] font-black">? ou H</kbd>
                </div>
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs transition-all shadow-md shadow-[#FF6B00]/30"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notificação Toast de Idioma */}
        {langToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl glass-panel bg-neutral-900/95 border border-[#FF6B00] text-white text-xs font-bold shadow-2xl backdrop-blur-xl animate-fade-in flex items-center gap-2">
            <Languages size={16} className="text-[#FF6B00]" />
            <span>{langToast}</span>
          </div>
        )}

        {/* Banner Flutuante para Retomar Vídeo */}
        {resumePrompt.show && (
          <div className="absolute top-4 left-4 right-4 z-30 max-w-xl mx-auto p-4 rounded-2xl glass-panel bg-neutral-900/90 border border-[#FF6B00]/50 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center flex-shrink-0 border border-[#FF6B00]/30">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
                  Continuar de onde parou
                </p>
                <p className="text-sm font-semibold text-gray-200">
                  Você parou em <span className="text-white font-bold">{formatTime(resumePrompt.time)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleResume(resumePrompt.time)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs transition-all shadow-lg shadow-[#FF6B00]/30 whitespace-nowrap"
              >
                Continuar ({formatTime(resumePrompt.time)})
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs border border-white/10 transition-all whitespace-nowrap"
              >
                Do início
              </button>
            </div>
          </div>
        )}

        {/* Botão Play Central quando Pausado */}
        {!isPlaying && !resumePrompt.show && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 cursor-pointer transition-opacity"
          >
            <div className="w-20 h-20 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white flex items-center justify-center shadow-2xl shadow-[#FF6B00]/50 transform hover:scale-110 transition-all">
              <Play size={36} className="fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Barra de Controles Inferior Redesenhada e Limpa */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 space-y-2.5 sm:space-y-3 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Barra de Progresso / Scrubber */}
          <div className="relative group/scrubber flex items-center py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 sm:h-1.5 bg-white/20 accent-[#FF6B00] hover:h-2.5 transition-all rounded-lg cursor-pointer appearance-none touch-none"
            />
          </div>

          {/* Botões da Barra Inferior */}
          <div className="flex items-center justify-between text-white text-xs font-semibold gap-1 sm:gap-2">
            {/* Lado Esquerdo: Play, Voltar 10s, Avançar 10s, Volume, Tempo */}
            <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
              <Tooltip content={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'} position="top">
                <button
                  onClick={togglePlay}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5 fill-current" />}
                </button>
              </Tooltip>

              <Tooltip content="Voltar 10s (←)" position="top">
                <button
                  onClick={() => skipTime(-10)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  <RotateCcw size={16} className="sm:w-4 sm:h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Avançar 10s (→)" position="top">
                <button
                  onClick={() => skipTime(10)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  <RotateCw size={16} className="sm:w-4 sm:h-4" />
                </button>
              </Tooltip>

              {/* Volume Slider */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} className="sm:w-4 sm:h-4" /> : <Volume2 size={16} className="sm:w-4 sm:h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-14 sm:w-16 h-1 bg-white/30 accent-[#FF6B00] rounded cursor-pointer hidden md:block"
                />
              </div>

              {/* Tempo Decorrido / Duração */}
              <div className="text-[10px] sm:text-xs font-mono font-bold text-gray-300 ml-0.5 sm:ml-2 whitespace-nowrap">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-gray-500"> / </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Lado Direito: Próximo Episódio, PiP, Cinema, Engrenagem ⚙️, Tela Cheia */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Botão Próximo Episódio */}
              {nextEpNum && onNextEpisode && (
                <Tooltip content={`Avançar para episódio ${nextEpNum}`} position="top">
                  <button
                    onClick={onNextEpisode}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FF6B00]/20 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white font-bold text-xs border border-[#FF6B00]/40 transition-all shadow-md"
                  >
                    <span>Próximo</span>
                    <ChevronRight size={14} />
                  </button>
                </Tooltip>
              )}

              {/* Picture-in-Picture */}
              <Tooltip content={isPipActive ? 'Sair do Picture-in-Picture' : 'Modo Picture-in-Picture'} position="top">
                <button
                  onClick={togglePip}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isPipActive
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                      : 'hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
                >
                  <PictureInPicture2 size={16} className="sm:w-4 sm:h-4" />
                </button>
              </Tooltip>

              {/* Modo Cinema */}
              <Tooltip content={isTheaterMode ? 'Sair do Modo Cinema (Esc)' : 'Modo Cinema (C)'} position="top">
                <button
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    isTheaterMode
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                      : 'hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
                >
                  <Film size={16} className="sm:w-4 sm:h-4" />
                </button>
              </Tooltip>

              {/* Menu Unificado de Configurações ⚙️ */}
              <div className="relative">
                <Tooltip content="Configurações do Player" position="top">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setSettingsTab('main');
                    }}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center gap-1.5 ${
                      showSettingsMenu
                        ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40 rotate-45'
                        : 'hover:bg-white/10 text-gray-300 hover:text-white'
                    }`}
                  >
                    <Settings size={16} className="sm:w-4 sm:h-4 transition-transform duration-300" />
                  </button>
                </Tooltip>

                {/* Popover Multinível de Configurações */}
                {showSettingsMenu && (
                  <div className="absolute bottom-12 right-0 p-3 rounded-2xl glass-panel bg-neutral-900/95 border border-white/10 shadow-2xl z-40 min-w-[220px] sm:min-w-[250px] animate-fade-in backdrop-blur-xl">
                    {/* Nível 1: Menu Principal */}
                    {settingsTab === 'main' && (
                      <div className="space-y-1 text-xs">
                        <div className="px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                          <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider">Configurações</span>
                          <span className="text-[10px] text-[#FF6B00] font-mono font-bold">AniStream</span>
                        </div>

                        {/* Áudio & Legenda Submenu Opção */}
                        <button
                          onClick={() => setSettingsTab('audio-sub')}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-gray-200 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Languages size={15} className="text-[#FF6B00]" />
                            <span>Áudio & Legendas</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-mono text-[10px]">
                            <span>
                              {audioLang.code}{' '}
                              {selectedSubTrack ? `| CC: ${selectedSubTrack.label}` : ' (Sem CC)'}
                            </span>
                            <ChevronRight size={14} />
                          </div>
                        </button>

                        {/* Velocidade Submenu Opção */}
                        <button
                          onClick={() => setSettingsTab('speed')}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-gray-200 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Settings size={15} className="text-[#FF6B00]" />
                            <span>Velocidade</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-mono text-[10px]">
                            <span>{playbackRate}x</span>
                            <ChevronRight size={14} />
                          </div>
                        </button>

                        {/* Apagar Luzes Toggle */}
                        <button
                          onClick={() => setIsLightDimmed(!isLightDimmed)}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-gray-200 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isLightDimmed ? <Sun size={15} className="text-[#FF6B00]" /> : <Moon size={15} className="text-[#FF6B00]" />}
                            <span>Apagar Luzes</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${isLightDimmed ? 'bg-[#FF6B00] text-white' : 'bg-white/10 text-gray-400'}`}>
                            {isLightDimmed ? 'ON' : 'OFF'}
                          </span>
                        </button>

                        {/* Marcar Concluído */}
                        <button
                          onClick={handleEpisodeCompletion}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/20 text-emerald-400 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} />
                            <span>Marcar Concluído</span>
                          </div>
                        </button>

                        <div className="border-t border-white/10 my-1" />

                        {/* Atalhos de Teclado */}
                        <button
                          onClick={() => {
                            setShowShortcutsModal(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-gray-300 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Keyboard size={15} className="text-gray-400" />
                            <span>Atalhos do Teclado</span>
                          </div>
                          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-gray-400">?</kbd>
                        </button>

                        {/* Reportar Problema */}
                        <button
                          onClick={() => {
                            setIsReportModalOpen(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-500/20 text-amber-400 font-bold transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={15} />
                            <span>Reportar Problema</span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Nível 2: Submenu Áudio & Legendas */}
                    {settingsTab === 'audio-sub' && (
                      <div className="space-y-2.5 text-xs">
                        <button
                          onClick={() => setSettingsTab('main')}
                          className="flex items-center gap-1 text-[#FF6B00] font-bold pb-1 border-b border-white/10 w-full text-left"
                        >
                          <ChevronLeft size={16} />
                          <span>Voltar às Configurações</span>
                        </button>

                        {/* Seção Idioma do Áudio */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Idioma do Áudio</span>
                          {AUDIO_LANGUAGES.map((lang) => {
                            const isSelected = audioLang.id === lang.id;
                            return (
                              <button
                                key={lang.id}
                                onClick={() => handleAudioChange(lang)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                                  isSelected
                                    ? 'bg-[#FF6B00] text-white shadow-md'
                                    : 'hover:bg-white/10 text-gray-300'
                                }`}
                              >
                                <span>{lang.label}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                                  {lang.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-white/10 my-1" />

                        {/* Seção Legendas (Dinâmica do Banco + Indicador de Ausência) */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">Legendas</span>
                          {availableSubtitles.length === 0 ? (
                            <div className="p-2.5 rounded-xl bg-white/5 text-gray-400 text-[11px] font-bold flex items-center gap-2 border border-white/5">
                              <Captions size={14} className="text-gray-500 shrink-0" />
                              <span>Nenhuma legenda cadastrada para esta fonte</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedSubTrack(null);
                                  setLangToast('Legendas Desativadas');
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                                  selectedSubTrack === null
                                    ? 'bg-[#FF6B00] text-white shadow-md'
                                    : 'hover:bg-white/10 text-gray-300'
                                }`}
                              >
                                <span>Desativadas</span>
                                {selectedSubTrack === null && <CheckCircle2 size={13} />}
                              </button>

                              {availableSubtitles.map((sub) => {
                                const isSelected = selectedSubTrack?.id === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => {
                                      setSelectedSubTrack(sub);
                                      setLangToast(`Legenda: ${sub.label}`);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                                      isSelected
                                        ? 'bg-[#FF6B00] text-white shadow-md'
                                        : 'hover:bg-white/10 text-gray-300'
                                    }`}
                                  >
                                    <span>{sub.label}</span>
                                    {isSelected && <CheckCircle2 size={13} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Nível 3: Submenu Velocidade */}
                    {settingsTab === 'speed' && (
                      <div className="space-y-2 text-xs">
                        <button
                          onClick={() => setSettingsTab('main')}
                          className="flex items-center gap-1 text-[#FF6B00] font-bold pb-1 border-b border-white/10 w-full text-left"
                        >
                          <ChevronLeft size={16} />
                          <span>Voltar às Configurações</span>
                        </button>

                        <div className="space-y-1">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => handleSpeedChange(rate)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-between ${
                                playbackRate === rate
                                  ? 'bg-[#FF6B00] text-white shadow-md'
                                  : 'hover:bg-white/10 text-gray-300'
                              }`}
                            >
                              <span>{rate}x {rate === 1 && '(Padrão)'}</span>
                              {playbackRate === rate && <CheckCircle2 size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tela Cheia */}
              <Tooltip content={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'} position="top">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize size={16} className="sm:w-4 sm:h-4" /> : <Maximize size={16} className="sm:w-4 sm:h-4" />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal de Report de Erros */}
      <ReportProblemModal
        episodeId={String(animeId)}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
