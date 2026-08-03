import { DatabaseBackup } from 'lucide-react';
import { OperationalPage } from '@/components/admin/OperationalPage';
import { AuditHistory, BackupOperation } from '@/components/admin/AdminOperations';

export default function Page() {
  return <div className="space-y-5"><OperationalPage title="Backups" description="Proteção e recuperação dos dados do catálogo." icon={DatabaseBackup} items={[{ title: 'Atenção antes de restaurar', description: 'Revise o arquivo e exporte o estado atual antes de aplicar dados.', status: 'attention' }]} /><BackupOperation /><AuditHistory resourceType="backup" /></div>;
}
