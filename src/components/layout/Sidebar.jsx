import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { NAV, ROLE_LABEL } from './navConfig';
import { BookMarked } from 'lucide-react';
import * as organizationsApi from '../../api/organizations';
import { buildStaticUrl } from '../../api/client';
import './Sidebar.css';

export default function Sidebar({ role, user, open, onNavigate }) {
  const location = useLocation();
  const allItems = NAV[role] || [];
  const [counts, setCounts] = useState({ pendingCount: 0, expiringCount: 0 });

  useEffect(() => {
    const fetchCounts = () => {
      if (role === 'SUPER_ADMIN') {
        organizationsApi.getCounts().then(res => {
          if (res.data) setCounts(res.data.data || res.data);
        }).catch(() => {});
      }
    };
    
    fetchCounts();
    
    // Poll every 30 seconds as a fallback for live updates
    const intervalId = setInterval(fetchCounts, 30000);
    
    window.addEventListener('refresh-sidebar-counts', fetchCounts);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('refresh-sidebar-counts', fetchCounts);
    };
  }, [role]);
  
  const items = allItems.filter(item => {
    // Collect the user's effective permissions (normalized by AuthContext)
    const perms = user?.permissions || [];
    
    // SUPER_ADMIN or ORG_USER with NO restrictions → full access to all items
    const isFullAdmin = (role === 'SUPER_ADMIN' || role === 'ORG_USER') && perms.length === 0;

    // Restricted ORG_USER sub-admins (have explicit modulePermissions)
    if (!isFullAdmin && role === 'ORG_USER' && perms.length > 0) {
      // Items without requiredPermissions are full-admin-only — hide from sub-admins
      if (!item.requiredPermissions || item.requiredPermissions.length === 0) return false;
      return item.requiredPermissions.some(perm => perms.includes(perm));
    }

    // Full admin: show everything, or filter by requiredPermissions if set (SUPER_ADMIN team)
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
    if (isFullAdmin) return true;
    return item.requiredPermissions.some(perm => perms.includes(perm));
  });

  const brandName = role === 'SUPER_ADMIN' 
    ? 'MacsLearn' 
    : (user?.organizationName || user?.organizationId?.name || ' LMS');

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} data-role={role}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" style={user?.organizationLogo ? { background: 'transparent' } : {}}>
          {user?.organizationLogo ? (
            <img src={buildStaticUrl(user.organizationLogo)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
          ) : (
            <BookMarked size={18} />
          )}
        </span>
        <div>
          <span className="sidebar__brand-name">{brandName}</span>
          <span className="sidebar__brand-role">{ROLE_LABEL[role]}</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => {
          const [path, search] = item.to.split('?');
          const isActive = location.pathname === path && (search ? location.search.includes(search) : !location.search || !location.search.includes('filter'));
          
          let badge = null;
          if (item.to.includes('filter=pending') && counts.pendingCount > 0) badge = counts.pendingCount;
          if (item.to.includes('filter=expiring') && counts.expiringCount > 0) badge = counts.expiringCount;

          return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <item.icon size={17} strokeWidth={2} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {badge !== null && (
              <span style={{ 
                background: '#EF4444', 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                padding: '2px 8px', 
                borderRadius: '12px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
              }}>
                {badge}
              </span>
            )}
          </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <p> LMS v1.0</p>
      </div>
    </aside>
  );
}
