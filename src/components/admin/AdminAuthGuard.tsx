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
    const controller = new AbortController();

    fetch('/api/admin/me', { cache: 'no-store', signal: controller.signal })
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
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (!isMounted) return;
        setAuthenticated(false);
        router.replace('/admin/login');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--admin-page)] p-4 text-[var(--admin-text)]" role="status" aria-live="polite">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-[var(--admin-muted)]">Verificando autenticação do painel...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--admin-page)] p-4 text-[var(--admin-text)]" role="alert" aria-live="assertive">
        <ShieldAlert size={36} className="text-red-400" />
        <p className="text-xs font-bold text-[var(--admin-muted)]">Acesso negado. Redirecionando para o login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
