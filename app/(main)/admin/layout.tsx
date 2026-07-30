'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col lg:flex-row relative">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <AdminHeader onOpenMobileSidebar={() => setMobileOpen(true)} />
          <main className="flex-1 p-2 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
