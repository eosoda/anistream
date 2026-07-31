import { RadioTower } from 'lucide-react'; import { OperationalPage } from '@/components/admin/OperationalPage';
export default function Page() { return <OperationalPage title="Comunicados" description="Mensagens operacionais exibidas aos usuários." icon={RadioTower} items={[{ title: 'Gerenciar comunicados', description: 'Use os controles existentes no dashboard.', href: '/admin' }]} />; }
