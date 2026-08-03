import { PlugZap } from 'lucide-react';
import { OperationalPage } from '@/components/admin/OperationalPage';
import { AuditHistory, IntegrationOperation } from '@/components/admin/AdminOperations';

export default function Page() {
  return <div className="space-y-5"><OperationalPage title="Integrações" description="Extensões Kenjitsu para metadados, episódios e mídia." icon={PlugZap} items={[{ title: 'Extensões e fontes', description: 'Ative, desative, versione e teste as fontes Kenjitsu.', href: '/admin/extensions', status: 'ok' }, { title: 'Webhooks', description: 'Integrações administrativas opcionais, sem substituir o Kenjitsu.', status: 'unknown' }]} /><IntegrationOperation /><AuditHistory resourceType="webhook" /></div>;
}
