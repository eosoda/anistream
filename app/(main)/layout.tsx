import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FloatingRecommendationsWidget } from '@/components/home/FloatingRecommendationsWidget';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BroadcastBanner />
      <Navbar />
      <main className="flex-grow w-full pb-20 lg:pb-0">{children}</main>
      <FloatingRecommendationsWidget />
      <MobileBottomNav />
      <Footer />
    </>
  );
}
