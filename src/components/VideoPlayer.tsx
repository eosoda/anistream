'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Moon,
  Share2,
  Check,
  SkipForward,
} from 'lucide-react';
import { QualitySelector } from './QualitySelector';
import { AudioSelector } from './AudioSelector';
import { SubtitleSelector } from './SubtitleSelector';
import { SpeedSelector } from './SpeedSelector';
import { CinemaOverlay } from './CinemaOverlay';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';

export interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
}

export interface VideoPlayerProps {
  episodeId?: string;
  animeId?: string;
  playbackUrl: string;
  title?: string;
  episodeNumber?: number;
  poster?: string;
  subtitles?: SubtitleTrack[];
  onNextEpisode?: () => void;
  onEnded?: () => void;
}

export function VideoPlayer({
  episodeId = 'default-ep',
  animeId,
  playbackUrl,
  title,
  episodeNumber,
  poster,
  subtitles = [],
  onNextEpisode,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Phase 1 New States
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [copiedLink, setCopiedLink] = useState(false);

  // Track selectors state
  const [qualities, setQualities] = useState<
    { id: number; height: number; bitrate: number; label: string }[]
  >([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);

  const [audioTracks, setAudioTracks] = useState<
    { id: number; name: string; lang: string }[]
  >([]);
  const [currentAudio, setCurrentAudio] = useState<number>(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');

  const hlsRef = useRef<any>(null);
  const { initialTime, updateProgress } = usePlaybackProgress(episodeId, animeId);

  // 1. Inicializar HLS.js ou HTML5 Nativo + Timestamp URL ?t=
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    setHasError(false);
    setErrorMessage('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
        const levels = data.levels.map((level: any, index: number) => ({
          id: index,
          height: level.height,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
        }));
        setQualities(levels);

        // Checar timestamp na URL ?t=124
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const tParam = params.get('t');
          if (tParam) {
            const seekSeconds = parseFloat(tParam);
            if (!isNaN(seekSeconds) && seekSeconds > 0) {
              video.currentTime = seekSeconds;
              return;
            }
          }
        }

        // Restaurar posição salva se não houver ?t= na URL
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event: any, data: any) => {
        const tracks = data.audioTracks.map((track: any) => ({
          id: track.id,
          name: track.name || track.lang || `Áudio ${track.id + 1}`,
          lang: track.lang || 'ja',
        }));
        setAudioTracks(tracks);
      });

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.response && data.response.code === 410) {
                setHasError(true);
                setErrorMessage('O token de reprodução expirou. Recarregue a página.');
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              setErrorMessage('Erro fatal ao reproduzir vídeo.');
              hls.destroy();
              break;
          }
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl, initialTime]);

  // 2. Teclas de Atalho Globais (Hotkeys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyJ':
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'KeyL':
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          break;
        case 'KeyN':
          e.preventDefault();
          if (onNextEpisode) onNextEpisode();
          break;
        case 'KeyD':
          e.preventDefault();
          setIsCinemaMode(!isCinemaMode);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isCinemaMode, onNextEpisode]);

  // 3. Temporizador de Contagem Regressiva no Final
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showCountdown && countdownSeconds > 0) {
      timer = setTimeout(() => {
        setCountdownSeconds((prev) => prev - 1);
      }, 1000);
    } else if (showCountdown && countdownSeconds === 0) {
      setShowCountdown(false);
      if (onNextEpisode) onNextEpisode();
    }
    return () => clearTimeout(timer);
  }, [showCountdown, countdownSeconds, onNextEpisode]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Pular Abertura (+85 segundos)
  const skipIntro = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      videoRef.current.duration || 0,
      videoRef.current.currentTime + 85
    );
  };

  // Modificar Velocidade
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleQualityChange = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) hlsRef.current.currentLevel = levelIndex;
  };

  const handleAudioChange = (trackId: number) => {
    setCurrentAudio(trackId);
    if (hlsRef.current) hlsRef.current.audioTrack = trackId;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Copiar Link com Timestamp ?t=
  const copyTimestampLink = () => {
    if (typeof window === 'undefined') return;
    const currentSec = Math.floor(currentTime);
    const urlWithTimestamp = `${window.location.origin}${window.location.pathname}?t=${currentSec}`;
    navigator.clipboard.writeText(urlWithTimestamp);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <CinemaOverlay active={isCinemaMode} onClose={() => setIsCinemaMode(false)} />

      <div
        ref={containerRef}
        className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group border border-white/10 ${
          isCinemaMode ? 'z-50 ring-4 ring-[#FF6B00]/50' : 'z-10'
        }`}
      >
        <video
          ref={videoRef}
          poster={poster}
          onTimeUpdate={() => {
            if (videoRef.current) {
              const cur = videoRef.current.currentTime;
              const dur = videoRef.current.duration;
              setCurrentTime(cur);
              updateProgress(cur, dur);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) onEnded();
            if (onNextEpisode) {
              setCountdownSeconds(5);
              setShowCountdown(true);
            }
          }}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        >
          {subtitles.map((sub, idx) => (
            <track
              key={idx}
              kind="subtitles"
              src={sub.src}
              srcLang={sub.language}
              label={sub.label}
              default={activeSubtitle === sub.language}
            />
          ))}
        </video>

        {/* Modal de Contagem Regressiva para Próximo Episódio */}
        {showCountdown && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Próximo episódio em {countdownSeconds}s...</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCountdown(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowCountdown(false);
                  if (onNextEpisode) onNextEpisode();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2"
              >
                <FastForward size={14} />
                <span>Assistir Agora</span>
              </button>
            </div>
          </div>
        )}

        {/* Overlay de Erro */}
        {hasError && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle size={48} className="text-amber-500 mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-white mb-1">Falha na Reprodução</h3>
            <p className="text-sm text-gray-300 mb-4 max-w-md">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold text-xs flex items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Recarregar Página</span>
            </button>
          </div>
        )}

        {/* Controles do Player */}
        <div className="absolute inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
          {/* Progress Bar */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="w-full h-1.5 accent-[#FF6B00] bg-white/20 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={togglePlay} className="p-2 rounded-xl bg-white/10 hover:bg-[#FF6B00] text-white transition-all">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Botão Pular Abertura (+85s) */}
              <button
                onClick={skipIntro}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#FF6B00] text-white font-bold text-xs flex items-center gap-1 transition-all border border-white/10"
                title="Pular Abertura (+85s)"
              >
                <SkipForward size={14} />
                <span className="hidden sm:inline">Pular Intro (+85s)</span>
              </button>

              {onNextEpisode && (
                <button onClick={onNextEpisode} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
                  <FastForward size={16} />
                </button>
              )}

              <button onClick={toggleMute} className="p-2 rounded-xl bg-white/10 text-white">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              <span className="text-xs font-mono text-gray-300 hidden sm:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão Copiar Timestamp Link */}
              <button
                onClick={copyTimestampLink}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                title="Copiar Link no Minuto Atual"
              >
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
              </button>

              {/* Seletor de Velocidade */}
              <SpeedSelector currentSpeed={playbackSpeed} onChange={handleSpeedChange} />

              {/* Modo Cinema */}
              <button
                onClick={() => setIsCinemaMode(!isCinemaMode)}
                className={`p-2 rounded-xl border transition-all ${
                  isCinemaMode
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
                title="Modo Cinema (Dim Lights)"
              >
                <Moon size={16} />
              </button>

              {subtitles.length > 0 && (
                <SubtitleSelector
                  subtitles={subtitles}
                  activeSubtitle={activeSubtitle}
                  onChange={setActiveSubtitle}
                />
              )}
              {audioTracks.length > 0 && (
                <AudioSelector
                  audioTracks={audioTracks}
                  currentAudio={currentAudio}
                  onChange={handleAudioChange}
                />
              )}
              {qualities.length > 0 && (
                <QualitySelector
                  qualities={qualities}
                  currentQuality={currentQuality}
                  onChange={handleQualityChange}
                />
              )}
              <button onClick={toggleFullscreen} className="p-2 rounded-xl bg-white/10 text-white">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
