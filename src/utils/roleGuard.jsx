import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/ui/PageLoader';
import toast from 'react-hot-toast';

function RedirectWithToast({ to, message }) {
  useEffect(() => {
    toast.error(message, { id: 'auth-error' });
  }, [message]);
  return <Navigate to={to} replace />;
}

export function RoleGuard({ allowedRoles, children }) {
  const { user, role, loading, homeFor } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(role)) {
    return <RedirectWithToast to={homeFor(role)} message="Access Denied: You do not have permission to view this page." />;
  }
  return children;
}

export function PermissionGuard({ allowedPermissions, children }) {
  const { user, role, loading, homeFor } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  
  const perms = user.permissions || user.modulePermissions || [];
  // Root Super Admin check
  if (perms.length === 0 && (role === 'SUPER_ADMIN' || role === 'ORG_USER')) return children;

  const hasAccess = allowedPermissions.some(p => perms.includes(p) || perms.includes('ALL'));
  if (!hasAccess) {
    return <RedirectWithToast to={homeFor(role)} message="Access Denied: You lack the required permissions to view this page." />;
  }
  
  return children;
}
