import client from './client';

export const list = (params) => client.get('/students', { params });
export const listPending = (params) => client.get('/students/pending', { params });
export const getById = (id) => client.get(`/students/${id}`);
export const getEnrollments = (id) => client.get(`/students/${id}/enrollments`);
export const update = (id, data) => client.patch(`/students/${id}`, data);
export const remove = (id) => client.delete(`/students/${id}`);
export const approve = (id, data) => client.patch(`/students/${id}/approve`, data);
export const scheduleInterview = (id, data) => client.patch(`/students/${id}/schedule-interview`, data);
export const reject = (id, rejectionReason) =>
  client.patch(`/students/${id}/reject`, { rejectionReason });
export const getStudentDetails = (id) => client.get(`/students/${id}/details`);
export const getPrograms = (id) => client.get(`/students/${id}/programs`);
export const confirmInterview = (id) => client.patch(`/students/${id}/confirm-interview`);
