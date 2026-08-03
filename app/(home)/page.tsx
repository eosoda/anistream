import { HomepageRenderer } from '@/components/home/HomepageRenderer';
import { getPublishedHomepageDocument } from '@/lib/homepage/repository';
import { resolveHomepageDocument } from '@/lib/homepage/resolver';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const published = await getPublishedHomepageDocument();
  const resolved = await resolveHomepageDocument(published.document);

  return (
    <div id="main-content" className="scroll-mt-20 md:scroll-mt-24">
      <HomepageRenderer document={published.document} blocks={resolved.blocks} />
    </div>
  );
}
