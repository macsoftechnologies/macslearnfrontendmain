import client from './client';

export const studentEnroll = (courseId) =>
  client.post(`/enrollments/student/courses/${courseId}/enroll`);
export const adminEnroll = (data) => client.post('/enrollments', data);
export const list = (params) => client.get('/enrollments', { params });
export const cancel = (id) => client.patch(`/enrollments/${id}/cancel`);
export const reactivate = (id) => client.patch(`/enrollments/${id}/reactivate`);
