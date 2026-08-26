import { Link } from 'react-router-dom';
import { ShieldAlert, CompassIcon } from 'lucide-react';
import Button from '../../components/ui/Button';

export function Unauthorized() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '10vh' }}>
      <ShieldAlert size={48} color="var(--danger)" style={{ margin: '0 auto var(--sp-4)' }} />
      <h1 className="page-title">Access restricted</h1>
      <p className="text-muted" style={{ margin: '10px 0 24px' }}>
        You don't have permission to view this page.
      </p>
      <Link to="/login">
        <Button>Back to Sign In</Button>
      </Link>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '10vh' }}>
      <CompassIcon size={48} color="var(--text-accent)" style={{ margin: '0 auto var(--sp-4)' }} />
      <h1 className="page-title">Page not found</h1>
      <p className="text-muted" style={{ margin: '10px 0 24px' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
