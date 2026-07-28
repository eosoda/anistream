'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('PWA Service Worker registrado com sucesso'))
        .catch((err) => console.log('Falha ao registrar Service Worker:', err));
    }

    // Evento beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstallBtn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-neutral-900/95 border border-[#FF6B00]/40 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-white animate-bounce">
      <div className="p-2 rounded-xl bg-[#FF6B00] text-white">
        <Download size={18} />
      </div>
      <div>
        <h4 className="font-bold">Instalar AniStream App</h4>
        <p className="text-[10px] text-gray-400">Instale na tela inicial para uso offline</p>
      </div>
      <button
        onClick={handleInstallClick}
        className="px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs transition-all"
      >
        Instalar
      </button>
      <button
        onClick={() => setShowInstallBtn(false)}
        className="p-1 text-gray-400 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
