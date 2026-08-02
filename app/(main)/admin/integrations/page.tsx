import { PlugZap } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
import { IntegrationOperation } from '@/components/admin/AdminOperations';
export default function Page() { return <div className="space-y-6"><OperationalPage title="Integrações" description="Extensões Kenjitsu para metadados, episódios e mídia." icon={PlugZap} items={[{ title: 'Extensões e fontes', description: 'Ative, desative, versione e teste as fontes Kenjitsu.', href: '/admin/extensions' }]} /><IntegrationOperation /></div>; }
