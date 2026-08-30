import client from './client';

// Multi-Channel WhatsApp-style Inbox & Messaging
export const getInbox = () => client.get('/discussion/inbox');
export const getContacts = () => client.get('/discussion/contacts');
export const startDirectThread = (recipientId, initialMessage) =>
  client.post('/discussion/direct-thread', { recipientId, initialMessage });
export const openBatchThread = (batchId, title) =>
  client.post('/discussion/batch-thread', { batchId, title });
export const getThreadMessages = (threadId) =>
  client.get(`/discussion/threads/${threadId}/messages`);
export const sendMessage = (threadId, content) =>
  client.post(`/discussion/threads/${threadId}/messages`, { content });

// Legacy Course Forum
export const createThread = (courseId, data) => client.post(`/discussion/courses/${courseId}/threads`, data);
export const listThreads = (courseId, params) => client.get(`/discussion/courses/${courseId}/threads`, { params });
export const getThread = (courseId, threadId) => client.get(`/discussion/courses/${courseId}/threads/${threadId}`);
export const reply = (threadId, data) => client.post(`/discussion/threads/${threadId}/replies`, data);
export const listReplies = (threadId) => client.get(`/discussion/threads/${threadId}/replies`);
export const acceptReply = (threadId, replyId) => client.patch(`/discussion/threads/${threadId}/replies/${replyId}/accept`);
export const getThreadMembers = (threadId) =>
  client.get(`/discussion/threads/${threadId}/members`);
export const openCourseThread = (courseId, batchId, title) =>
  client.post('/discussion/course-thread', { courseId, batchId, title });
export const previewMembers = (courseId, batchId) =>
  client.get('/discussion/preview-members', { params: { courseId, batchId } });

export const deleteThread = (threadId) =>
  client.delete(`/discussion/threads/${threadId}`);
