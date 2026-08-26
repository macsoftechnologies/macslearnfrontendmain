import EmptyState from '../../components/ui/EmptyState';
import { Rocket } from 'lucide-react';

export default function ComingSoon({ title = 'Coming Soon', description = 'We are currently building this module.' }) {
  return (
    <div className="page" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState
        icon={Rocket}
        title={title}
        description={description}
      />
    </div>
  );
}
