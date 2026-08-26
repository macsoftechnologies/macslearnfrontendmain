import { useState, useEffect } from 'react';
import { Popover } from '@headlessui/react';
import { Menu, ChevronDown, LogOut, UserCircle, KeyRound, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../notifications/NotificationBell';
import { ROLE_LABEL } from './navConfig';
import ConfirmDialog from '../ui/ConfirmDialog';
import './TopBar.css';

const ROLE_PATH = { SUPER_ADMIN: 'super-admin', ORG_USER: 'admin', FACULTY: 'faculty', STUDENT: 'student', FINANCE: 'finance' };

export default function TopBar({ onMenuClick, title }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.fullName || user?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="topbar__menu" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        {title && <h1 className="topbar__title">{title}</h1>}
      </div>

      <div className="topbar__right">
        <button 
          className="topbar__theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBell />

        <Popover className="topbar__profile">
          <Popover.Button className="topbar__profile-btn">
            <span className="topbar__avatar">{initials}</span>
            <span className="topbar__profile-meta">
              <span className="topbar__name">{user?.fullName || user?.name || 'Account'}</span>
              <span className="topbar__role">{ROLE_LABEL[role]}</span>
            </span>
            <ChevronDown size={15} />
          </Popover.Button>
          <Popover.Panel className="topbar__dropdown">
            <button onClick={() => navigate(`/${ROLE_PATH[role]}/profile`)}>
              <UserCircle size={15} /> My Profile
            </button>
            <button onClick={() => navigate(`/${ROLE_PATH[role]}/profile`)}>
              <KeyRound size={15} /> Change Password
            </button>
            <hr />
            <button onClick={() => setShowLogoutConfirm(true)} className="topbar__logout">
              <LogOut size={15} /> Sign Out
            </button>
          </Popover.Panel>
        </Popover>
      </div>


      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        description="Are you sure you want to log out?"
        confirmLabel="Sign Out"
        danger={false}
      />
    </header>
  );
}

