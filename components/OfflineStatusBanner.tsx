'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto bg-amber-950/90 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff size={14} className="text-amber-400 flex-shrink-0" />
            <span>Modo Offline ativo</span>
            <span className="text-amber-400/80 font-normal hidden sm:inline">
              — Acessando catálogo & favoritos salvos no IndexedDB
            </span>
            <Database size={13} className="text-amber-400/80 ml-1 flex-shrink-0" />
          </div>
        </motion.div>
      )}

      {!isOffline && showReconnected && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold">
            <Wifi size={14} className="text-emerald-400 flex-shrink-0" />
            <span>Conexão Restabelecida</span>
            <span className="text-emerald-400/80 font-normal hidden sm:inline">
              — Dados sincronizados com a internet
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
