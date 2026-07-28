import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FloatingRecommendationsWidget } from '@/components/FloatingRecommendationsWidget';

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
          <main className="flex-grow w-full pb-20 lg:pb-0">{children}</main>
          <FloatingRecommendationsWidget />
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}

