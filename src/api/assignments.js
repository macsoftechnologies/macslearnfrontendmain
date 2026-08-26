import client from './client';

export const create = (courseId, data) => client.post(`/courses/${courseId}/assignments`, data);
export const list = (courseId, params) => client.get(`/courses/${courseId}/assignments`, { params });
export const submit = (courseId, assignmentId, formData) =>
  client.post(`/courses/${courseId}/assignments/${assignmentId}/submit`, formData);
export const listSubmissions = (courseId, assignmentId, params) =>
  client.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`, { params });
export const gradeSubmission = (courseId, submissionId, data) =>
  client.patch(`/courses/${courseId}/assignments/submissions/${submissionId}/grade`, data);
