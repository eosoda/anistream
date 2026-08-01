'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';
import QueryProvider from '@/components/layout/QueryProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSetupOrAdmin = pathname?.startsWith('/setup') || pathname?.startsWith('/admin');

  if (isSetupOrAdmin) {
    return (
      <QueryProvider>
        <main className="flex-grow w-full">{children}</main>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <BroadcastBanner />
      <Navbar />
      <main className="flex-grow w-full pb-20 lg:pb-0">{children}</main>
      <Footer />
    </QueryProvider>
  );
}
