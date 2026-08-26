import client from './client';

export const list = (params) => client.get('/courses', { params });
export const getById = (id) => client.get(`/courses/${id}`);
export const create = (data) => client.post('/courses', data);
export const update = (id, data) => client.patch(`/courses/${id}`, data);
export const updateStatus = (id, status, reviewNotes) => client.patch(`/courses/${id}/status`, { status, reviewNotes });
export const remove = (id) => client.delete(`/courses/${id}`);
export const getStudents = (id) => client.get(`/courses/${id}/students`);
