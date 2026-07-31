import { DatabaseBackup } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
import { BackupOperation } from '@/components/admin/AdminOperations';
export default function Page() { return <div className="space-y-6"><OperationalPage title="Backups" description="Proteção e recuperação dos dados do catálogo." icon={DatabaseBackup} items={[{ title: 'Atenção', description: 'Revise o arquivo antes de restaurar dados.', status: 'attention' }]} /><BackupOperation /></div>; }
