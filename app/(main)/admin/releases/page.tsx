import { Rocket } from 'lucide-react';
import { OperationalPage } from '@/components/admin/OperationalPage';
import { AuditHistory, ReleaseOperation } from '@/components/admin/AdminOperations';

export default function Page() {
  return <div className="space-y-5"><OperationalPage title="Releases" description="Histórico editorial das versões publicadas." icon={Rocket} items={[{ title: 'Changelog público', description: 'Visualize a linha do tempo publicada.', href: '/changelog', status: 'ok' }, { title: 'Publicação local', description: 'A release será registrada antes de qualquer deploy.', status: 'unknown' }]} /><ReleaseOperation /><AuditHistory resourceType="release" /></div>;
}
