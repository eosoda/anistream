'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, GitCommit, Sparkles, Tag, Wrench } from 'lucide-react';

interface Release {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'FEATURE' | 'FIX' | 'IMPROVEMENT';
  releasedAt: string;
}

export default function ChangelogPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then((res) => res.json())
      .then((data) => {
        if (data.releases && Array.isArray(data.releases)) {
          setReleases(data.releases);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'FEATURE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 flex items-center gap-1">
            <Sparkles size={11} />
            <span>Novo Recurso</span>
          </span>
        );
      case 'FIX':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 size={11} />
            <span>Correção</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center gap-1">
            <Wrench size={11} />
            <span>Melhoria</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      {/* Botão Voltar */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Voltar ao AniStream</span>
      </Link>

      {/* Header */}
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <GitCommit size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Notas de Versão & Changelog</h1>
            <p className="text-xs text-gray-400">
              Acompanhe as últimas atualizações, novos recursos e melhorias da plataforma AniStream.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de Releases */}
      <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-white/10">
        {releases.length === 0 && !loading && (
          <div className="p-8 text-center rounded-3xl bg-white/5 border border-white/10 text-gray-400 text-xs">
            Nenhuma nota de versão cadastrada ainda.
          </div>
        )}

        {releases.map((release) => (
          <div key={release.id} className="relative pl-10 space-y-3">
            {/* Ponto da Timeline */}
            <div className="absolute left-2 top-2.5 -translate-x-1/2 w-4 h-4 rounded-full bg-[#FF6B00] border-4 border-[#0B0B0F]" />

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white bg-white/10 px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                    <Tag size={12} className="text-[#FF6B00]" />
                    <span>v{release.version}</span>
                  </span>
                  {getTypeBadge(release.type)}
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  {new Date(release.releasedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h2 className="text-lg font-black text-white">{release.title}</h2>
              <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                {release.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
