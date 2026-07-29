'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function SetupGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Checar se o modo manutenção está ativo
    fetch('/api/maintenance')
      .then((res) => res.json())
      .then((data) => {
        if (data.maintenance) {
          const isAllowedPath =
            pathname.startsWith('/admin') ||
            pathname.startsWith('/setup') ||
            pathname.startsWith('/manutencao') ||
            pathname.startsWith('/api');

          if (!isAllowedPath) {
            router.push('/manutencao');
          }
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
