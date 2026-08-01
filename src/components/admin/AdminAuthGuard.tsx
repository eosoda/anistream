'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [loading, setLoading] = useState(!isLoginPage);
  const [authenticated, setAuthenticated] = useState<boolean | null>(
    isLoginPage ? true : null
  );

  useEffect(() => {
    if (isLoginPage) return;

    let isMounted = true;

    fetch('/api/admin/me', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Não autenticado');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          router.replace('/admin/login');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthenticated(false);
        router.replace('/admin/login');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center text-white gap-3 p-4">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Verificando autenticação do painel...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center text-white gap-3 p-4">
        <ShieldAlert size={36} className="text-red-400" />
        <p className="text-xs font-bold text-gray-400">Acesso negado. Redirecionando para o login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
