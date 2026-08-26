import client from './client';

export const list = (params) => client.get('/notifications', { params });
export const unreadCount = () => client.get('/notifications/unread-count');
export const markRead = (id) => client.patch(`/notifications/${id}/read`);
export const markAllRead = () => client.post('/notifications/mark-all-read');
export const broadcast = (data) => client.post('/notifications/broadcast', data);
