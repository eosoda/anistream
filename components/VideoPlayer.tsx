'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock,
  Film,
  Tv,
  Languages,
  MessageSquare,
  Globe,
  Captions,
  Keyboard,
  X,
  HelpCircle,
} from 'lucide-react';
import { useWatchProgress } from '@/hooks/useWatchProgress';

interface VideoPlayerProps {
  animeId: number;
  animeTitle: string;
  animeImage?: string;
  episodeNum: number;
  episodeTitle?: string;
  nextEpNum?: number | null;
  onNextEpisode?: () => void;
}

const SAMPLE_STREAMS = [
  {
    id: 's1',
    name: 'Servidor 1 (HD Legendado)',
    type: 'Principal',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 's2',
    name: 'Servidor 2 (Full HD Dublado)',
    type: 'Alta Velocidade',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
  {
    id: 's3',
    name: 'Servidor 3 (Backup HD)',
    type: 'Reserva',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
];

const AUDIO_LANGUAGES = [
  { id: 'ja', name: 'Japonês', label: 'Japonês (Original)', code: 'JP', badge: 'LEG' },
  { id: 'pt', name: 'Português', label: 'Português (Brasil)', code: 'PT-BR', badge: 'DUB' },
  { id: 'en', name: 'Inglês', label: 'Inglês (English)', code: 'EN', badge: 'DUB' },
  { id: 'es', name: 'Espanhol', label: 'Espanhol (Español)', code: 'ES', badge: 'DUB' },
];

const SUBTITLE_LANGUAGES = [
  { id: 'pt', name: 'Português', label: 'Português (Brasil)', code: 'PT-BR' },
  { id: 'en', name: 'Inglês', label: 'Inglês (English)', code: 'EN' },
  { id: 'es', name: 'Espanhol', label: 'Espanhol (Español)', code: 'ES' },
  { id: 'off', name: 'Desativado', label: 'Sem Legendas', code: 'OFF' },
];

// Dynamic timed subtitle cues for simulation
const getCurrentSubtitleCue = (seconds: number, langId: string) => {
  if (langId === 'off') return null;

  const loopSec = Math.floor(seconds) % 30;

  if (loopSec >= 1 && loopSec < 6) {
    if (langId === 'pt') return 'Naquele dia, a humanidade relembrou o medo de viver sob o controle deles...';
    if (langId === 'en') return 'On that day, mankind received a grim reminder of the terror of being ruled by them...';
    if (langId === 'es') return 'Ese día, la humanidad recordó el terror de vivir bajo su dominio...';
  } else if (loopSec >= 6 && loopSec < 12) {
    if (langId === 'pt') return 'Juntos, nós lutaremos para proteger tudo o que nos resta de esperança!';
    if (langId === 'en') return 'Together, we will fight to protect everything we have left of hope!';
    if (langId === 'es') return '¡Juntos lucharemos para proteger todo lo que nos queda de esperanza!';
  } else if (loopSec >= 12 && loopSec < 18) {
    if (langId === 'pt') return 'Se você não lutar, você não pode vencer. Eleve o seu cosmo!';
    if (langId === 'en') return "If you don't fight, you can't win. Raise your cosmos!";
    if (langId === 'es') return '¡Si no luchas, no puedes ganar. ¡Eleva tu cosmos!';
  } else if (loopSec >= 18 && loopSec < 24) {
    if (langId === 'pt') return 'A verdadeira força desperta no momento de maior escuridão.';
    if (langId === 'en') return 'True strength awakens in the moment of greatest darkness.';
    if (langId === 'es') return 'La verdadera fuerza despierta en el momento de mayor oscuridad.';
  } else if (loopSec >= 24 && loopSec < 29) {
    if (langId === 'pt') return 'A jornada continua. Este é o destino dos escolhidos!';
    if (langId === 'en') return 'The journey continues. This is the destiny of the chosen ones!';
    if (langId === 'es') return 'El viaje continúa. ¡Este es el destino de los elegidos!';
  }

  return null;
};

export function VideoPlayer({
  animeId,
  animeTitle,
  animeImage,
  episodeNum,
  episodeTitle,
  nextEpNum,
  onNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { saveProgress, getProgress } = useWatchProgress();

  const [activeServer, setActiveServer] = useState(SAMPLE_STREAMS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Audio and Subtitle language states
  const [audioLang, setAudioLang] = useState(AUDIO_LANGUAGES[0]);
  const [subtitleLang, setSubtitleLang] = useState(SUBTITLE_LANGUAGES[0]);
  const [langToast, setLangToast] = useState<string | null>(null);

  const handleAudioChange = (lang: (typeof AUDIO_LANGUAGES)[0]) => {
    setAudioLang(lang);
    setLangToast(`Áudio: ${lang.label}`);
    setTimeout(() => setLangToast(null), 2500);
  };

  const handleSubtitleChange = (sub: (typeof SUBTITLE_LANGUAGES)[0]) => {
    setSubtitleLang(sub);
    if (sub.id === 'off') {
      setLangToast('Legendas Desativadas');
    } else {
      setLangToast(`Legenda: ${sub.label}`);
    }
    setTimeout(() => setLangToast(null), 2500);
  };

  // Resume prompt state
  const [resumePrompt, setResumePrompt] = useState<{
    show: boolean;
    time: number;
  }>({ show: false, time: 0 });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to MM:SS
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

  // Handle Video Metadata Loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      const saved = getProgress(animeId, episodeNum);
      if (saved && saved.currentTime > 5 && saved.percentage < 90) {
        setResumePrompt({
          show: true,
          time: saved.currentTime,
        });
      } else {
        setResumePrompt({ show: false, time: 0 });
      }
    }
  };

  // Time update handler & Progress saver
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(curr);

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

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      // Save exact stop time
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
      videoRef.current.play();
      setIsPlaying(true);
      // If prompt was showing, hide it
      if (resumePrompt.show) {
        setResumePrompt((prev) => ({ ...prev, show: false }));
      }
    }
  }, [isPlaying, saveProgress, animeId, animeTitle, animeImage, episodeNum, episodeTitle, duration, resumePrompt.show]);

  // Resume from saved timestamp
  const handleResume = (resumeTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = resumeTime;
      setCurrentTime(resumeTime);
      videoRef.current.play();
      setIsPlaying(true);
    }
    setResumePrompt({ show: false, time: 0 });
  };

  // Restart from 0
  const handleStartOver = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play();
      setIsPlaying(true);
    }
    setResumePrompt({ show: false, time: 0 });
  };

  // Seek handler
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

  // Skip -10s or +10s
  const skipTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  // Toggle Mute
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

  // Change Playback Speed
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Fullscreen toggle
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

  // Auto-hide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses when typing in form inputs
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          e.preventDefault();
        } else if (isTheaterMode) {
          setIsTheaterMode(false);
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
  }, [isTheaterMode, showShortcutsModal, volume, isPlaying, duration, togglePlay, toggleFullscreen, toggleMute, skipTime]);

  return (
    <div className="space-y-4">
      {/* Server & Language Config Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl glass-panel border border-white/10 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="flex items-center gap-1.5 text-gray-300 font-bold whitespace-nowrap flex-shrink-0 mr-1">
            <Server size={15} className="text-[#FF6B00]" />
            <span>Servidor:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {SAMPLE_STREAMS.map((server) => {
              const isActive = activeServer.id === server.id;
              return (
                <button
                  key={server.id}
                  onClick={() => {
                    setActiveServer(server);
                    setIsPlaying(false);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap text-[11px] sm:text-xs ${
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

        {/* Audio & Subtitle Active Badges */}
        <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-[11px] sm:text-xs">
            <Volume2 size={13} className="text-[#FF6B00]" />
            <span>Áudio: <strong className="text-white">{audioLang.name}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-bold text-[11px] sm:text-xs">
            <Captions size={13} className="text-[#FF6B00]" />
            <span>Legenda: <strong className="text-white">{subtitleLang.name}</strong></span>
          </div>
        </div>
      </div>

      {/* Dark Backdrop for Cinema Mode */}
      {isTheaterMode && (
        <div
          onClick={() => setIsTheaterMode(false)}
          className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in"
        />
      )}

      {/* Main Video Container */}
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
        {/* Video Element */}
        <video
          ref={videoRef}
          src={activeServer.src}
          poster={animeImage}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            if (duration > 0) {
              saveProgress({
                animeId,
                animeTitle,
                animeImage,
                episodeNum,
                episodeTitle,
                currentTime: duration,
                duration,
              });
            }
          }}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Keyboard Shortcuts Modal */}
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

        {/* Language Toast Notification */}
        {langToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl glass-panel bg-neutral-900/95 border border-[#FF6B00] text-white text-xs font-bold shadow-2xl backdrop-blur-xl animate-fade-in flex items-center gap-2">
            <Languages size={16} className="text-[#FF6B00]" />
            <span>{langToast}</span>
          </div>
        )}

        {/* Subtitle Cue Overlay */}
        {getCurrentSubtitleCue(currentTime, subtitleLang.id) && (
          <div className="absolute bottom-20 inset-x-4 z-20 flex justify-center pointer-events-none select-none">
            <p className="px-4 py-1.5 rounded-lg bg-black/85 backdrop-blur-xs text-white font-black text-sm md:text-base tracking-wide border border-white/10 text-center max-w-2xl shadow-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {getCurrentSubtitleCue(currentTime, subtitleLang.id)}
            </p>
          </div>
        )}

        {/* Floating Resume Prompt Banner */}
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

        {/* Big Center Play Button Overlay when paused */}
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

        {/* Video Overlay Controls Bar */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 space-y-2.5 sm:space-y-3 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Scrubber Bar */}
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

          {/* Bottom Control Buttons */}
          <div className="flex items-center justify-between text-white text-xs font-semibold gap-1 sm:gap-2">
            {/* Left Controls: Play, Skip, Time */}
            <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
              <button
                onClick={togglePlay}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5 fill-current" />}
              </button>

              <button
                onClick={() => skipTime(-10)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Voltar 10s"
              >
                <RotateCcw size={16} className="sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => skipTime(10)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Avançar 10s"
              >
                <RotateCw size={16} className="sm:w-4 sm:h-4" />
              </button>

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

              {/* Time Display */}
              <div className="text-[10px] sm:text-xs font-mono font-bold text-gray-300 ml-0.5 sm:ml-2 whitespace-nowrap">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-gray-500"> / </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Audio/Sub, Speed, Next Ep, Cinema, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Audio & Subtitle Language Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLangMenu(!showLangMenu);
                    setShowSpeedMenu(false);
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 text-[11px] sm:text-xs font-bold ${
                    showLangMenu || subtitleLang.id !== 'off'
                      ? 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/40'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/10'
                  }`}
                  title="Idiomas e Legendas"
                >
                  <Languages size={14} />
                  <span className="hidden sm:inline font-mono uppercase">
                    {audioLang.code} {subtitleLang.id !== 'off' ? `| CC: ${subtitleLang.code}` : ''}
                  </span>
                </button>

                {showLangMenu && (
                  <div className="absolute bottom-10 right-0 p-3 rounded-2xl glass-panel bg-neutral-900 border border-white/10 shadow-2xl space-y-3 z-30 min-w-[200px] sm:min-w-[230px] max-w-[calc(100vw-2rem)]">
                    {/* Audio Language Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider px-1">
                        <Volume2 size={13} />
                        <span>Idioma do Áudio</span>
                      </div>

                      <div className="space-y-1">
                        {AUDIO_LANGUAGES.map((lang) => {
                          const isSelected = audioLang.id === lang.id;
                          return (
                            <button
                              key={lang.id}
                              onClick={() => {
                                handleAudioChange(lang);
                                setShowLangMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
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
                    </div>

                    <div className="border-t border-white/10 my-1" />

                    {/* Subtitles Language Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider px-1">
                        <Captions size={13} />
                        <span>Legendas</span>
                      </div>

                      <div className="space-y-1">
                        {SUBTITLE_LANGUAGES.map((sub) => {
                          const isSelected = subtitleLang.id === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                handleSubtitleChange(sub);
                                setShowLangMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                                  : 'hover:bg-white/10 text-gray-300'
                              }`}
                            >
                              <span>{sub.label}</span>
                              {isSelected && <CheckCircle2 size={13} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Speed Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2 sm:px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-bold text-gray-200 border border-white/10 transition-all flex items-center gap-1"
                >
                  <span>{playbackRate}x</span>
                  <Settings size={12} />
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-10 right-0 p-2 rounded-xl glass-panel bg-neutral-900 border border-white/10 shadow-2xl space-y-1 z-30 min-w-[100px]">
                    <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase border-b border-white/10">
                      Velocidade
                    </p>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          playbackRate === rate
                            ? 'bg-[#FF6B00] text-white'
                            : 'hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {rate}x {rate === 1 && '(Padrão)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Next Episode Button */}
              {nextEpNum && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00]/20 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white font-bold text-xs border border-[#FF6B00]/30 transition-all"
                  title="Próximo Episódio"
                >
                  <span>Próximo</span>
                  <ChevronRight size={14} />
                </button>
              )}

              {/* Keyboard Shortcuts Button (desktop only) */}
              <button
                onClick={() => setShowShortcutsModal(!showShortcutsModal)}
                className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg transition-colors items-center gap-1.5 ${
                  showShortcutsModal
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                    : 'hover:bg-white/10 text-gray-300 hover:text-white'
                }`}
                title="Atalhos de teclado (?)"
              >
                <Keyboard size={16} className="sm:w-4 sm:h-4" />
              </button>

              {/* Cinema Mode Button */}
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isTheaterMode
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/40'
                    : 'hover:bg-white/10 text-gray-300 hover:text-white'
                }`}
                title={isTheaterMode ? 'Sair do Modo Cinema (Esc)' : 'Modo Cinema'}
              >
                <Film size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-bold">
                  {isTheaterMode ? 'Sair do Cinema' : 'Cinema'}
                </span>
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              >
                {isFullscreen ? <Minimize size={16} className="sm:w-4 sm:h-4" /> : <Maximize size={16} className="sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
