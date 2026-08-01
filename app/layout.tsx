import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import UiProviders from '@/components/layout/UiProviders';
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner';
import { PwaRegister } from '@/components/layout/PwaRegister';
import { SetupGuard } from '@/components/layout/SetupGuard';

export const metadata: Metadata = {
  title: 'AniStream - Catálogo & Streaming de Animes',
  description: 'Acompanhe os melhores animes, lançamentos de temporadas, top populares e catálogo completo com dados Jikan e AniList.',
};

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <UiProviders>
          <SetupGuard />
          <OfflineStatusBanner />
          <PwaRegister />
          {children}
        </UiProviders>
      </body>
    </html>
  );
}
