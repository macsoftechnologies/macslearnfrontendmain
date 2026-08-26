import { CheckCheck, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import * as notificationsApi from '../../api/notifications';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import './Notifications.css';

export default function Notifications() {
  const { items, page, setPage, meta, loading, refresh } = usePagination(notificationsApi.list, {}, 15);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      window.dispatchEvent(new Event('refresh-notification-count'));
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      toast.success('All notifications marked as read');
      window.dispatchEvent(new Event('refresh-notification-count'));
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Inbox</span>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay up to date with course activity and announcements.</p>
        </div>
        <Button variant="outline" icon={CheckCheck} onClick={markAll}>Mark all read</Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up — nothing new to see here." />
      ) : (
        <div className="notif-list">
          {items.map((n) => (
            <button key={n._id || n.id} className={`notif-list__item ${n.isRead ? '' : 'notif-list__item--unread'}`} onClick={() => markRead(n._id || n.id)}>
              <span className="notif-list__dot" />
              <span className="notif-list__body">
                <span className="notif-list__msg">{n.message || n.title}</span>
                <span className="notif-list__time">{n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
