import client from './client';

export const list = (courseId, lessonId) =>
  client.get(`/courses/${courseId}/lessons/${lessonId}/checkpoints`);
export const create = (courseId, lessonId, data) =>
  client.post(`/courses/${courseId}/lessons/${lessonId}/checkpoints`, data);
export const answer = (courseId, lessonId, checkpointId, data) =>
  client.post(`/courses/${courseId}/lessons/${lessonId}/checkpoints/${checkpointId}/answer`, data);
export const ungraded = (courseId, lessonId) =>
  client.get(`/courses/${courseId}/lessons/${lessonId}/checkpoints/ungraded`);
export const grade = (courseId, lessonId, answerId, data) =>
  client.patch(`/courses/${courseId}/lessons/${lessonId}/checkpoints/answers/${answerId}/grade`, data);
