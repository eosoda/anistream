'use client';

import React, { useRef } from 'react';
import {
  Heart,
  CheckCheck,
  BellRing,
  HeartOff,
  Download,
  Upload,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/context/ToastContext';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { EpisodeRemindersPanel } from '@/components/home/EpisodeRemindersPanel';
import { Tooltip } from '@/components/ui/Tooltip';
import { clientStateStorageKeys, migrateClientState } from '@/lib/storage/client-state-migration';

export default function FavoritesPage() {
  const {
    favorites,
    newEpisodesCount,
    markAllAsSeen,
  } = useFavorites();

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportBackup = () => {
    try {
      migrateClientState();
      const favsRaw = localStorage.getItem(clientStateStorageKeys.favorites) || '[]';
      const progressRaw = localStorage.getItem(clientStateStorageKeys.watchProgress) || '{}';

      const backupData = {
        app: 'AniStream',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        favorites: JSON.parse(favsRaw),
        watchProgress: JSON.parse(progressRaw),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anistream-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Backup Exportado com Sucesso!',
        message: 'Seu arquivo JSON de favoritos e progresso foi baixado.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Erro ao Exportar',
        message: 'Não foi possível gerar o arquivo de backup.',
      });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (!parsed.favorites && !parsed.watchProgress)) {
          throw new Error('Formato de backup inválido');
        }

        if (Array.isArray(parsed.favorites)) {
          localStorage.setItem(clientStateStorageKeys.favorites, JSON.stringify(parsed.favorites));
        }

        if (parsed.watchProgress && typeof parsed.watchProgress === 'object') {
          localStorage.setItem(clientStateStorageKeys.watchProgress, JSON.stringify(parsed.watchProgress));
        }

        showToast({
          type: 'success',
          title: 'Backup Importado!',
          message: 'Seus favoritos e histórico foram restaurados. Recarregando...',
        });

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Falha na Importação',
          message: 'O arquivo JSON selecionado não é um backup AniStream válido.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <Heart size={28} className="fill-current" />
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Meus Animes Favoritos
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Seus animes salvos e verificação automática de novos episódios via API Kenjitsu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content="Exportar backup completo em JSON" position="bottom">
            <button
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all flex items-center gap-1.5"
            >
              <Download size={14} className="text-amber-400" />
              <span>Exportar JSON</span>
            </button>
          </Tooltip>

          <Tooltip content="Restaurar favoritos e progresso de um arquivo JSON" position="bottom">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all flex items-center gap-1.5"
            >
              <Upload size={14} className="text-sky-400" />
              <span>Importar JSON</span>
            </button>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />

          {newEpisodesCount > 0 && (
            <button
              onClick={markAllAsSeen}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              <span>Marcar Vistos ({newEpisodesCount})</span>
            </button>
          )}

          {favorites.length > 0 && (
            <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30">
              {favorites.length} {favorites.length === 1 ? 'salvo' : 'salvos'}
            </span>
          )}
        </div>
      </div>

      {/* New Episodes Highlight Banner */}
      {newEpisodesCount > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-neutral-900 border border-emerald-500/40 shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <BellRing size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Novos Episódios Lançados!
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-400 text-black">
                  {newEpisodesCount} {newEpisodesCount === 1 ? 'novo' : 'novos'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Animes favoritados receberam novos episódios recentemente. Verificados via Kenjitsu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Episode Reminders Panel */}
      <EpisodeRemindersPanel favorites={favorites} />

      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {favorites.map((anime, index) => (
            <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HeartOff size={32} />}
          title="Sua lista de favoritos está vazia"
          description="Clique no ícone de coração nos animes para salvá-los nesta lista para fácil acesso e atualizações."
          actionHref="/populares"
          actionText="Explorar Animes Populares"
        />
      )}

    </div>
  );
}

