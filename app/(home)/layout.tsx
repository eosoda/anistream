import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { DeferredFloatingRecommendationsWidget } from '@/components/home/DeferredFloatingRecommendationsWidget';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BroadcastBanner />
      <Navbar />
      <main className="flex-grow w-full pb-20 lg:pb-0">{children}</main>
      <DeferredFloatingRecommendationsWidget />
      <Footer />
    </>
  );
}
