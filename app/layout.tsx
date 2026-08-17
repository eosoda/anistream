import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import UiProviders from '@/components/layout/UiProviders';
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner';
import { PwaRegister } from '@/components/layout/PwaRegister';
import { SetupGuard } from '@/components/layout/SetupGuard';
import { getPublicExperience } from '@/lib/public-experience/repository';
import { publicExperienceThemeVariables } from '@/lib/public-experience/defaults';

// A configuração publicada vive no PostgreSQL/Redis e pode mudar pelo painel.
// O layout precisa ser renderizado em runtime para não congelar tema e metadata
// durante o build da imagem.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const experience = await getPublicExperience();
  return {
    title: `${experience.config.branding.appName} - Catálogo & Streaming de Animes`,
    description: experience.config.branding.description,
    manifest: '/manifest.json',
    icons: {
      icon: experience.config.branding.favicon,
      shortcut: experience.config.branding.favicon,
      apple: '/icon-192.png',
    },
  };
}

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const experience = await getPublicExperience();
  const themeVariables = publicExperienceThemeVariables(experience.config.theme);
  const cssVariables = Object.entries(themeVariables)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
  return (
    <html lang="pt-BR" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <style id="public-experience-theme">{`:root{${cssVariables}}`}</style>
        <UiProviders initialExperience={experience.config}>
          <SetupGuard />
          <OfflineStatusBanner />
          <PwaRegister />
          {children}
        </UiProviders>
      </body>
    </html>
  );
}
