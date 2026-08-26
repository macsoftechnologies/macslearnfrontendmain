import { useEffect, useRef, useState } from 'react';
import { Popover } from '@headlessui/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import * as notificationsApi from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import './NotificationBell.css';

const ROLE_PATH = { SUPER_ADMIN: 'super-admin', ORG_USER: 'admin', FACULTY: 'faculty', STUDENT: 'student', FINANCE: 'finance' };

export default function NotificationBell() {
  const { role, token } = useAuth();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchCount = async () => {
    try {
      const { data } = await notificationsApi.unreadCount();
      setCount(data?.data?.count || 0);
    } catch {
      /* silent */
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list({ page: 1, limit: 10 });
      setItems(data?.data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    const handleCountRefresh = () => {
      fetchCount();
      if (items.length > 0) fetchList();
    };
    window.addEventListener('refresh-notification-count', handleCountRefresh);

    // Polling fallback every 20 seconds
    const interval = setInterval(fetchCount, 20000);

    // Auto-sync when window receives focus
    const handleFocus = () => {
      fetchCount();
    };
    window.addEventListener('focus', handleFocus);

    if (token) {
      socketRef.current = io(import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:5000', {
        auth: { token },
      });

      socketRef.current.on('new_notification', (newNotif) => {
        setCount((c) => c + 1);
        setItems((prev) => [newNotif, ...prev].slice(0, 10)); // keep last 10 in dropdown
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
      });
    }

    return () => {
      window.removeEventListener('refresh-notification-count', handleCountRefresh);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n)));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
    } catch {
      /* silent */
    }
  };

  return (
    <Popover className="notif">
      <Popover.Button className="notif__trigger" onClick={fetchList}>
        <Bell size={19} />
        {count > 0 && <span className="notif__badge">{count > 9 ? '9+' : count}</span>}
      </Popover.Button>
      <Popover.Panel className="notif__panel">
        <div className="notif__head">
          <span>Notifications</span>
          <button onClick={markAll}>
            <CheckCheck size={13} /> Mark all read
          </button>
        </div>
        <div className="notif__list">
          {loading && <div className="notif__empty">Loading…</div>}
          {!loading && items.length === 0 && <div className="notif__empty">You're all caught up.</div>}
          {!loading &&
            items.map((n) => (
              <button key={n._id || n.id} className={`notif__item ${n.isRead ? '' : 'notif__item--unread'}`} onClick={() => markRead(n._id || n.id)}>
                <span className="notif__dot" />
                <span className="notif__body">
                  <span className="notif__msg">{n.message || n.title}</span>
                  <span className="notif__time">
                    {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                  </span>
                </span>
              </button>
            ))}
        </div>
        <Link to={`/${ROLE_PATH[role]}/notifications`} className="notif__viewall">
          View all notifications
        </Link>
      </Popover.Panel>
    </Popover>
  );
}
