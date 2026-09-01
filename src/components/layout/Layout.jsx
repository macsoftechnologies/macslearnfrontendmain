import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatWidget from '../chat/ChatWidget';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

export default function Layout({ title }) {
  const { role, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const orgName = role === 'SUPER_ADMIN' 
    ? 'MacsLearn' 
    : (user?.organizationName || user?.organizationId?.name || 'MacsLearn');

  useEffect(() => {
    document.title = orgName;
  }, [orgName]);

  return (
    <div className="app-shell">
      <Sidebar role={role} user={user} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="app-shell__scrim" onClick={() => setMenuOpen(false)} />}
      <div className="app-shell__main">
        <TopBar onMenuClick={() => setMenuOpen((o) => !o)} title={title} />
        <main className="app-shell__content">
          <Outlet />
        </main>
        <footer className="app-shell__footer">
          <span className="app-shell__footer-text">
            &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
          </span>
        </footer>
      </div>
      {['ORG_USER', 'FACULTY', 'STUDENT'].includes(role) && <ChatWidget />}
    </div>
  );
}
