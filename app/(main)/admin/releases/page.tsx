import { Rocket } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
import { ReleaseOperation } from '@/components/admin/AdminOperations';
export default function Page() { return <div className="space-y-6"><OperationalPage title="Releases" description="Histórico editorial das versões publicadas." icon={Rocket} items={[{ title: 'Changelog público', description: 'Visualizar a linha do tempo publicada.', href: '/changelog' }, { title: 'Versão atual', description: '2.2.0 em preparação nesta branch.', status: 'attention' }]} /><ReleaseOperation /></div>; }
