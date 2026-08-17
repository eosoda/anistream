'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  placement?: 'banner' | 'home' | 'player';
  ctaLabel?: string | null;
  ctaHref?: string | null;
}

export function BroadcastBanner() {
  const { config } = usePublicExperience();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/broadcast', { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.announcements && Array.isArray(data.announcements)) {
            setAnnouncements(data.announcements);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const visibleAnnouncements = announcements.filter((a) => a.placement !== 'player' && !dismissedIds.includes(a.id));

  if (!config.features.publicAnnouncements || visibleAnnouncements.length === 0) return null;

  const current = visibleAnnouncements[0];

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'WARNING':
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      case 'SUCCESS':
        return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      default:
        return 'bg-[#FF6B00]/20 border-[#FF6B00]/40 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-400 shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
      default:
        return <Info size={16} className="text-[#FF6B00] shrink-0" />;
    }
  };

  return (
    <div
      className={`w-full py-2.5 px-4 border-b text-xs flex items-center justify-between gap-3 transition-all ${getTypeStyle(current.type)}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto text-center sm:text-left">
        {getTypeIcon(current.type)}
        <span className="font-black uppercase tracking-wider">{current.title}:</span>
        <span className="font-medium text-gray-200">{current.content}</span>
        {current.ctaLabel && current.ctaHref && (
          <a href={current.ctaHref} className="shrink-0 font-bold underline decoration-[var(--accent)] underline-offset-2">
            {current.ctaLabel}
          </a>
        )}
      </div>

      <button
        onClick={() => setDismissedIds([...dismissedIds, current.id])}
        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        title="Dispensar aviso"
        aria-label={`Dispensar aviso: ${current.title}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
