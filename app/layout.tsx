import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/layout/QueryProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FloatingRecommendationsWidget } from '@/components/home/FloatingRecommendationsWidget';
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner';
import { PwaRegister } from '@/components/layout/PwaRegister';

export const metadata: Metadata = {
  title: 'AniStream - Catálogo & Streaming de Animes',
  description: 'Acompanhe os melhores animes, lançamentos de temporadas, top populares e catálogo completo com dados Jikan e AniList.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0B0B0F] text-white min-h-screen flex flex-col antialiased selection:bg-[#FF6B00] selection:text-white" suppressHydrationWarning>
        <QueryProvider>
          <Navbar />
          <OfflineStatusBanner />
          <PwaRegister />
          <main className="flex-grow w-full pb-20 lg:pb-0">{children}</main>
          <FloatingRecommendationsWidget />
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}

