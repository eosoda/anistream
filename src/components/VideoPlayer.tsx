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
  Settings,
  FastForward,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { QualitySelector } from './QualitySelector';
import { AudioSelector } from './AudioSelector';
import { SubtitleSelector } from './SubtitleSelector';

export interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
}

export interface VideoPlayerProps {
  playbackUrl: string;
  title?: string;
  episodeNumber?: number;
  poster?: string;
  subtitles?: SubtitleTrack[];
  onNextEpisode?: () => void;
  onEnded?: () => void;
}

export function VideoPlayer({
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

  // Track selectors state
  const [qualities, setQualities] = useState<
    { id: number; height: number; bitrate: number; label: string }[]
  >([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

  const [audioTracks, setAudioTracks] = useState<
    { id: number; name: string; lang: string }[]
  >([]);
  const [currentAudio, setCurrentAudio] = useState<number>(0);

  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');
  const [showSettings, setShowSettings] = useState(false);

  const hlsRef = useRef<any>(null);

  // 1. Inicializar HLS.js ou HTML5 Nativo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    setHasError(false);
    setErrorMessage('');

    // Destruir instância anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Suporte nativo HLS (Safari / iOS)
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

      // Evento: Manifest Carregado
      hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
        const levels = data.levels.map((level: any, index: number) => ({
          id: index,
          height: level.height,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
        }));
        setQualities(levels);
      });

      // Evento: Trilhas de Áudio
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event: any, data: any) => {
        const tracks = data.audioTracks.map((track: any) => ({
          id: track.id,
          name: track.name || track.lang || `Áudio ${track.id + 1}`,
          lang: track.lang || 'ja',
        }));
        setAudioTracks(tracks);
      });

      // Recuperação de Erros de Mídia / Rede / Expiração
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.response && data.response.code === 410) {
                setHasError(true);
                setErrorMessage('O token ou URL de reprodução expirou. Atualize a página.');
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

    // Cleanup ao desmontar
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl]);

  // 2. Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 3. Modificar Qualidade
  const handleQualityChange = (levelIndex: number) => {
    setCurrentQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  // 4. Modificar Faixa de Áudio
  const handleAudioChange = (trackId: number) => {
    setCurrentAudio(trackId);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }
  };

  // 5. Fullscreen Toggle
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

  // Formatador de tempo (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group border border-white/10"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
          if (onNextEpisode) onNextEpisode();
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

      {/* Overlay de Erro / Expiração */}
      {hasError && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={48} className="text-amber-500 mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-1">Falha na Reprodução</h3>
          <p className="text-sm text-gray-300 mb-4 max-w-md">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} />
            <span>Recarregar Página</span>
          </button>
        </div>
      )}

      {/* Controles Flutuantes */}
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
          className="w-full h-1.5 accent-[#FF6B00] bg-white/20 rounded-lg cursor-pointer transition-all"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white/10 hover:bg-[#FF6B00] text-white transition-all"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1 text-xs font-bold"
              >
                <FastForward size={16} />
              </button>
            )}

            <span className="text-xs font-mono text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Trilha de Legenda */}
            {subtitles.length > 0 && (
              <SubtitleSelector
                subtitles={subtitles}
                activeSubtitle={activeSubtitle}
                onChange={(lang) => setActiveSubtitle(lang)}
              />
            )}

            {/* Seletor de Áudio */}
            {audioTracks.length > 0 && (
              <AudioSelector
                audioTracks={audioTracks}
                currentAudio={currentAudio}
                onChange={handleAudioChange}
              />
            )}

            {/* Seletor de Qualidade */}
            {qualities.length > 0 && (
              <QualitySelector
                qualities={qualities}
                currentQuality={currentQuality}
                onChange={handleQualityChange}
              />
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
