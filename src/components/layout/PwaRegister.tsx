'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';

export function PwaRegister() {
  const { showToast } = useToast();
  const { config } = usePublicExperience();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    if (!config.features.pwa || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const triggerUpdateToast = () => {
      showToast({
        type: 'info',
        title: 'Nova Atualização Disponível! 🚀',
        message: 'Uma nova versão do AniStream está pronta. Clique aqui para recarregar a página agora.',
        duration: 18000,
        actionText: 'Clique aqui para Atualizar a Página',
        onClick: () => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
              reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
            });
          }
          window.location.reload();
        },
      });
    };

    // Registrar Service Worker e monitorar atualizações
    const registerWorker = () =>
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // 1. Se já houver um worker esperando ativação
          if (registration.waiting) {
            triggerUpdateToast();
          }

          // 2. Quando um novo worker for encontrado e baixado
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  triggerUpdateToast();
                }
              };
            }
          };
        })
        .catch((err) => console.log('Falha ao registrar Service Worker:', err));
    const registrationTimer = window.setTimeout(registerWorker, 8000);

    // Evento beforeinstallprompt para PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.clearTimeout(registrationTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [config.features.pwa, showToast]);

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
    <div className="fixed bottom-[calc(var(--bottom-nav-height)+1rem+env(safe-area-inset-bottom))] right-4 z-40 p-4 rounded-2xl bg-neutral-900/95 border border-[#FF6B00]/40 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-white lg:bottom-6 lg:right-6">
      <div className="p-2 rounded-xl bg-[#FF6B00] text-white">
        <Download size={18} />
      </div>
      <div>
        <h4 className="font-bold">Instalar AniStream App</h4>
        <p className="text-[10px] text-gray-400">Instale na tela inicial para uso offline</p>
      </div>
      <button onClick={handleInstallClick} className="px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-bold text-xs transition-all">
        Instalar
      </button>
      <button onClick={() => setShowInstallBtn(false)} className="p-1 text-gray-400 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}
