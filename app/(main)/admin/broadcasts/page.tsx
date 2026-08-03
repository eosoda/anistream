import { RadioTower } from 'lucide-react';
import { OperationalPage } from '@/components/admin/OperationalPage';
import { AuditHistory, BroadcastOperation } from '@/components/admin/AdminOperations';

export default function Page() {
  return <div className="space-y-5"><OperationalPage title="Comunicados" description="Mensagens operacionais exibidas aos usuários." icon={RadioTower} items={[{ title: 'Canal público', description: 'Publicações ficam disponíveis na interface e deixam um registro de auditoria.', status: 'ok' }]} /><BroadcastOperation /><AuditHistory resourceType="broadcast" /></div>;
}
