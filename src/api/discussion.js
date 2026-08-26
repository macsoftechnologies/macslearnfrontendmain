import client from './client';

export const createThread = (courseId, data) => client.post(`/discussion/courses/${courseId}/threads`, data);
export const listThreads = (courseId, params) =>
  client.get(`/discussion/courses/${courseId}/threads`, { params });
export const getThread = (courseId, threadId) =>
  client.get(`/discussion/courses/${courseId}/threads/${threadId}`);
export const reply = (threadId, data) => client.post(`/discussion/threads/${threadId}/replies`, data);
export const listReplies = (threadId) => client.get(`/discussion/threads/${threadId}/replies`);
export const acceptReply = (threadId, replyId) =>
  client.patch(`/discussion/threads/${threadId}/replies/${replyId}/accept`);
