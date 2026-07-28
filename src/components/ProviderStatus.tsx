'use client';

import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ProviderHealth } from '@/lib/streams/types';

export interface ProviderStatusProps {
  reports: ProviderHealth[];
}

export function ProviderStatus({ reports }: ProviderStatusProps) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 glass-panel">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={18} className="text-[#FF6B00]" />
        <h3 className="text-sm font-bold text-white">Status dos Provedores</h3>
      </div>

      <div className="space-y-2">
        {reports.map((report) => (
          <div
            key={report.providerId}
            className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5"
          >
            <div className="flex items-center gap-2">
              {report.status === 'healthy' && (
                <CheckCircle2 size={16} className="text-emerald-400" />
              )}
              {report.status === 'degraded' && (
                <AlertTriangle size={16} className="text-amber-400" />
              )}
              {report.status === 'down' && (
                <XCircle size={16} className="text-red-400" />
              )}
              <span className="text-xs font-bold text-gray-200">
                {report.name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-gray-400">{report.latencyMs}ms</span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                  report.status === 'healthy'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : report.status === 'degraded'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {report.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
