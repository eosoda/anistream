'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function SetupGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ignorar redirecionamentos se a rota já for /setup ou se for rotas administrativas/APIs
    if (!pathname || pathname.startsWith('/setup') || pathname.startsWith('/api/')) {
      return;
    }

    async function checkSetupStatus() {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();

        // Se a aplicação ainda não possui administrador cadastrado, redirecionar para /setup
        if (data && data.isInitialized === false) {
          router.replace('/setup');
        }
      } catch (err) {
        // Ignorar falhas de conexão temporárias
      }
    }

    checkSetupStatus();
  }, [pathname, router]);

  return null;
}
