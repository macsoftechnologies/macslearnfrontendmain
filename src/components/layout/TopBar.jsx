import { useState, useEffect } from 'react';
import { Popover } from '@headlessui/react';
import { Menu, ChevronDown, LogOut, UserCircle, KeyRound, Sun, Moon, Video, MessageSquare, Settings, BarChart3 } from 'lucide-react';
import * as liveSessionsApi from '../../api/liveSessions';
import * as discussionApi from '../../api/discussion';
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
  const [liveCount, setLiveCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const fetchHeaderCounts = async () => {
    try {
      if (['ORG_USER', 'FACULTY', 'STUDENT'].includes(role)) {
        const [liveRes, chatRes] = await Promise.allSettled([
          liveSessionsApi.list({ status: 'SCHEDULED' }),
          discussionApi.getInbox()
        ]);

        if (liveRes.status === 'fulfilled') {
          const lData = liveRes.value?.data?.data || liveRes.value?.data || [];
          setLiveCount(Array.isArray(lData) ? lData.length : 0);
        }
        if (chatRes.status === 'fulfilled') {
          const inbox = chatRes.value?.data?.data || chatRes.value?.data || {};
          const dChats = Array.isArray(inbox.directChats) ? inbox.directChats : [];
          const bGroups = Array.isArray(inbox.batchGroups) ? inbox.batchGroups : [];
          const allConvs = [...dChats, ...bGroups];

          let readMap = {};
          try {
            readMap = JSON.parse(localStorage.getItem(`chat_last_read_${user?.id || user?.userId || user?._id}`) || '{}');
          } catch {}

          let unread = 0;
          allConvs.forEach(conv => {
            const lastRead = readMap[conv.id];
            const msgTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
            if (msgTime > 0) {
              if (!lastRead || msgTime > new Date(lastRead).getTime()) {
                unread += 1;
              }
            }
          });
          setUnreadMsgCount(unread);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchHeaderCounts();
    const handleChatRefresh = () => fetchHeaderCounts();
    window.addEventListener('refresh-chat-unread-count', handleChatRefresh);
    const interval = setInterval(fetchHeaderCounts, 15000);
    return () => {
      window.removeEventListener('refresh-chat-unread-count', handleChatRefresh);
      clearInterval(interval);
    };
  }, [role, user?.id]);

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
        {['ORG_USER', 'FACULTY', 'STUDENT'].includes(role) && (
          <>
            {/* Live Sessions Header Button */}
            <button
              className="topbar__header-btn"
              onClick={() => navigate(`/${ROLE_PATH[role]}/live-sessions`)}
              title="Live Sessions & Schedule"
              aria-label="Live Sessions"
            >
              <Video size={18} />
              {liveCount > 0 && (
                <span className="topbar__header-badge topbar__header-badge--live">
                  {liveCount > 99 ? '99+' : liveCount}
                </span>
              )}
            </button>

            {/* Messages Header Button */}
            <button
              className="topbar__header-btn"
              onClick={() => navigate(`/${ROLE_PATH[role]}/chat`)}
              title="Messages & Discussions"
              aria-label="Messages"
            >
              <MessageSquare size={18} />
              {unreadMsgCount > 0 && (
                <span className="topbar__header-badge topbar__header-badge--chat">
                  {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                </span>
              )}
            </button>
          </>
        )}

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
            {role === 'ORG_USER' && (
              <button onClick={() => navigate('/admin/reports/overview')}>
                <BarChart3 size={15} /> Reports & Analytics
              </button>
            )}
            {role === 'FINANCE' && (
              <button onClick={() => navigate('/finance/reports/overview')}>
                <BarChart3 size={15} /> Financial Reports
              </button>
            )}
            {role === 'ORG_USER' && (
              <button onClick={() => navigate('/admin/settings/organization')}>
                <Settings size={15} /> Organization Settings
              </button>
            )}
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

