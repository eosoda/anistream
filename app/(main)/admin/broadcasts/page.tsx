import { RadioTower } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
import { BroadcastOperation } from '@/components/admin/AdminOperations';
export default function Page() { return <div className="space-y-6"><OperationalPage title="Comunicados" description="Mensagens operacionais exibidas aos usuários." icon={RadioTower} items={[{ title: 'Canal público', description: 'Comunicados são anunciados na interface.', status: 'ok' }]} /><BroadcastOperation /></div>; }
