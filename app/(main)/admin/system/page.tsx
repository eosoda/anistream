import { Settings } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
import { SystemOperation } from '@/components/admin/AdminOperations';
export default function Page() { return <div className="space-y-6"><OperationalPage title="Sistema" description="Saúde da aplicação e controles seguros de disponibilidade." icon={Settings} items={[{ title: 'Diagnóstico', description: 'Serviços principais disponíveis.', status: 'ok' }]} /><SystemOperation /></div>; }
