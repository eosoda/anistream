'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminCommandPalette } from '@/components/admin/AdminPrimitives';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminAuthGuard>
      <div
        className="admin-shell relative flex min-h-screen flex-col text-white lg:flex-row"
        style={{ '--admin-sidebar-width': collapsed ? '4.75rem' : '17rem' } as React.CSSProperties}
      >
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminHeader
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onOpenCommandPalette={() => setCommandOpen(true)}
          />
          <main className="admin-main flex-1 overflow-y-auto"><div className="admin-content">{children}</div></main>
        </div>
        <AdminCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    </AdminAuthGuard>
  );
}
