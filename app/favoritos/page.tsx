'use client';

import React, { useState } from 'react';
import {
  Heart,
  Sparkles,
  RefreshCw,
  CheckCheck,
  Tv,
  BellRing,
  Filter,
  HeartOff,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { AnimeCard } from '@/components/AnimeCard';
import { EmptyState } from '@/components/EmptyState';
import { EpisodeRemindersPanel } from '@/components/EpisodeRemindersPanel';
import { ForYouSection } from '@/components/ForYouSection';
import { Tooltip } from '@/components/Tooltip';

export default function FavoritesPage() {
  const {
    favorites,
    newEpisodesMap,
    newEpisodesCount,
    isCheckingNewEpisodes,
    lastCheckTime,
    checkNewEpisodes,
    markAllAsSeen,
    recommendationsEnabled,
    toggleRecommendationsEnabled,
  } = useFavorites();

  const [activeTab, setActiveTab] = useState<'all' | 'new_episodes' | 'airing'>('all');

  const airingFavorites = favorites.filter(
    (a) => a.airing || a.status === 'Currently Airing' || a.status === 'Airing'
  );

  const favoritesWithNewEp = favorites.filter(
    (a) => newEpisodesMap[a.mal_id]?.hasNewEpisode
  );

  const displayedFavorites =
    activeTab === 'new_episodes'
      ? favoritesWithNewEp
      : activeTab === 'airing'
      ? airingFavorites
      : favorites;

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
            Seus animes salvos e verificação automática de novos episódios via API Jikan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip content="Verificar datas de lançamentos de episódios na API Jikan" position="bottom">
            <button
              onClick={() => checkNewEpisodes(true)}
              disabled={isCheckingNewEpisodes}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all flex items-center gap-1.5"
            >
              <RefreshCw
                size={14}
                className={`text-[#FF6B00] ${isCheckingNewEpisodes ? 'animate-spin' : ''}`}
              />
              <span>
                {isCheckingNewEpisodes ? 'Verificando Jikan...' : 'Verificar API'}
              </span>
            </button>
          </Tooltip>

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
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-neutral-900 border border-emerald-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 flex-shrink-0 animate-bounce">
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
                Animes favoritados receberam novos episódios recentemente. Verificados via Jikan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setActiveTab('new_episodes')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-md shadow-emerald-500/30 flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Ver {newEpisodesCount} Com Novo Episódio</span>
            </button>
          </div>
        </div>
      )}

      {/* Recommendation Settings Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#171322] via-[#12131D] to-[#0D0E15] border border-white/10 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl border transition-all ${
              recommendationsEnabled
                ? 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <Sparkles size={22} className={recommendationsEnabled ? 'animate-spin-slow' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Recomendações Personalizadas
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  recommendationsEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                {recommendationsEnabled ? 'Ativadas' : 'Desativadas'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
              Gera sugestões de animes com base nos seus <strong className="text-white">Favoritos</strong> e nos <strong className="text-white">Animes Assistidos</strong>.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={toggleRecommendationsEnabled}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border font-bold text-xs transition-all ${
            recommendationsEnabled
              ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-[#FF6B00]/30'
              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>{recommendationsEnabled ? 'Desativar Recomendações' : 'Ativar Recomendações'}</span>
          <div
            className={`w-10 h-5 rounded-full p-0.5 transition-colors relative flex items-center ${
              recommendationsEnabled ? 'bg-black/40' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                recommendationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Episode Reminders Panel */}
      <EpisodeRemindersPanel favorites={favorites} />

      {/* Filter Tabs */}
      {favorites.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === 'all'
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
              }`}
            >
              <Filter size={13} />
              <span>Todos ({favorites.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('new_episodes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === 'new_episodes'
                  ? 'bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
              }`}
            >
              <Sparkles size={13} className={newEpisodesCount > 0 ? 'text-emerald-400 fill-current' : ''} />
              <span>Novos Episódios ({newEpisodesCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('airing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                activeTab === 'airing'
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
              }`}
            >
              <Tv size={13} />
              <span>Em Exibição ({airingFavorites.length})</span>
            </button>
          </div>

          {lastCheckTime && (
            <span className="text-[11px] text-gray-500 hidden md:inline">
              Última verificação API: {lastCheckTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {displayedFavorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedFavorites.map((anime, index) => (
            <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
          ))}
        </div>
      ) : activeTab === 'new_episodes' ? (
        <EmptyState
          title="Nenhum anime com novos episódios no momento"
          description="Quando um anime da sua lista de favoritos lançar um novo episódio via Jikan API, ele aparecerá com destaque aqui."
          actionHref="/temporadas"
          actionText="Ver Animes da Temporada"
        />
      ) : activeTab === 'airing' ? (
        <EmptyState
          title="Nenhum anime em exibição na sua lista"
          description="Adicione animes da temporada atual aos seus favoritos para acompanhar episódios semanais."
          actionHref="/temporadas"
          actionText="Explorar Temporada Atual"
        />
      ) : (
        <EmptyState
          icon={<HeartOff size={32} />}
          title="Sua lista de favoritos está vazia"
          description="Clique no ícone de coração nos animes para salvá-los nesta lista para fácil acesso e atualizações."
          actionHref="/populares"
          actionText="Explorar Animes Populares"
        />
      )}

      {/* Recommendations Section in Favorites Page */}
      {recommendationsEnabled && (
        <div className="pt-8 border-t border-white/10 space-y-4">
          <ForYouSection />
        </div>
      )}
    </div>
  );
}

