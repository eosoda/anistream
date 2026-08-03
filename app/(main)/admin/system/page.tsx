import { Settings } from 'lucide-react';
import { OperationalPage } from '@/components/admin/OperationalPage';
import { AuditHistory, SystemOperation } from '@/components/admin/AdminOperations';

export default function Page() {
  return <div className="space-y-5"><OperationalPage title="Sistema" description="Saúde da aplicação e controles seguros de disponibilidade." icon={Settings} items={[{ title: 'Diagnóstico local', description: 'Use a visão geral para acompanhar banco, Kenjitsu e extensões.', href: '/admin', status: 'ok' }]} /><SystemOperation /><AuditHistory /></div>;
}
