'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Play, Sparkles } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

const DAYS_OF_WEEK = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

const MOCK_SCHEDULE: Record<string, any[]> = {
  segunda: [
    {
      id: 'vinland-saga-2',
      title: 'Vinland Saga Season 2',
      time: '12:30',
      episode: 'Episódio 14',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1170/124312l.jpg',
      audio: 'Dublado / Legendado',
    },
  ],
  terca: [
    {
      id: 'chainsaw-man',
      title: 'Chainsaw Man',
      time: '13:00',
      episode: 'Episódio 12',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
      audio: 'Legendado',
    },
  ],
  quarta: [
    {
      id: 'jujutsu-kaisen-2',
      title: 'Jujutsu Kaisen Season 2',
      time: '14:00',
      episode: 'Episódio 18',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1792/138022l.jpg',
      audio: 'Dublado / Legendado',
    },
  ],
  quinta: [
    {
      id: 'dr-stone-3',
      title: 'Dr. Stone: New World',
      time: '11:30',
      episode: 'Episódio 09',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1429/134468l.jpg',
      audio: 'Dublado',
    },
  ],
  sexta: [
    {
      id: 'frieren',
      title: 'Frieren: Beyond Journey\'s End',
      time: '12:00',
      episode: 'Episódio 24',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1015/138025l.jpg',
      audio: 'Dublado / Legendado',
    },
  ],
  sabado: [
    {
      id: 'demon-slayer-4',
      title: 'Demon Slayer: Hashira Training Arc',
      time: '14:30',
      episode: 'Episódio 08',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1423/140228l.jpg',
      audio: 'Dublado / Legendado',
    },
    {
      id: 'solo-leveling',
      title: 'Solo Leveling',
      time: '15:00',
      episode: 'Episódio 12',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1869/140994l.jpg',
      audio: 'Dublado',
    },
  ],
  domingo: [
    {
      id: 'one-piece',
      title: 'One Piece',
      time: '10:00',
      episode: 'Episódio 1115',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
      audio: 'Legendado',
    },
    {
      id: 'my-hero-academia-7',
      title: 'My Hero Academia Season 7',
      time: '06:30',
      episode: 'Episódio 15',
      posterUrl: 'https://cdn.myanimelist.net/images/anime/1258/141040l.jpg',
      audio: 'Dublado / Legendado',
    },
  ],
};

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState('sabado');

  const releases = MOCK_SCHEDULE[selectedDay] || [];

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Calendar size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Calendário de Lançamentos Semanal</h1>
            <p className="text-xs text-gray-400">
              Acompanhe os dias e horários de exibição dos novos episódios da temporada
            </p>
          </div>
        </div>
      </div>

      {/* Seletor dos Dias da Semana */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border ${
              selectedDay === day.id
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-[#FF6B00]/30 scale-105'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Grade de Lançamentos do Dia */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <Sparkles size={18} className="text-[#FF6B00]" />
          <span>Episódios Previstos — {DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.label}</span>
        </h2>

        {releases.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/10 space-y-2">
            <p className="text-sm font-bold text-gray-300">Nenhum lançamento agendado para este dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {releases.map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="p-4 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex gap-4 group"
              >
                <div className="w-24 aspect-[2/3] relative rounded-2xl overflow-hidden bg-black flex-shrink-0 shadow-lg border border-white/10">
                  <SafeImage
                    src={anime.posterUrl}
                    alt={anime.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#FF6B00] font-bold text-xs mb-1">
                      <Clock size={14} />
                      <span>{anime.time}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF6B00] transition-colors line-clamp-1">
                      {anime.title}
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold">{anime.episode}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                      {anime.audio}
                    </span>
                    <Play size={16} className="text-gray-400 group-hover:text-[#FF6B00] transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
