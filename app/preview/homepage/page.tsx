import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BroadcastBanner } from '@/components/layout/BroadcastBanner';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { HomepageRenderer } from '@/components/home/HomepageRenderer';
import { getAdminHomepageState } from '@/lib/homepage/repository';
import { resolveHomepageDocument } from '@/lib/homepage/resolver';
import { verifyAdminToken } from '@/lib/security/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Prévia da Home | AniStream',
  robots: { index: false, follow: false },
};

export default async function HomepagePreviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || !(await verifyAdminToken(token)).authenticated) redirect('/admin/login?next=/preview/homepage');

  const state = await getAdminHomepageState();
  const resolved = await resolveHomepageDocument(state.draft);

  return (
    <>
      <BroadcastBanner />
      <Navbar />
      <main className="flex-grow w-full pb-20 lg:pb-0">
        <div className="border-b border-[#FF6B00]/20 bg-[#FF6B00]/10 px-4 py-2 text-center text-xs font-bold text-[#FFB27A]" role="status">
          Prévia privada do rascunho da Home — não publicada para visitantes.
        </div>
        <HomepageRenderer document={state.draft} blocks={resolved.blocks} preview />
      </main>
      <Footer />
    </>
  );
}

