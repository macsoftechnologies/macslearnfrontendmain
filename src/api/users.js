import client from './client';

export const getMe = () => client.get('/users/me');
export const updateMe = (data) => client.patch('/users/me', data);
export const create = (data) => client.post('/users', data);
export const createStudent = (data) => client.post('/users/students', data);
export const list = (params) => client.get('/users', { params });
export const updateStatus = (id, status) => client.patch(`/users/${id}`, { status });
export const update = (id, data) => client.patch(`/users/${id}`, data);
export const remove = (id) => client.delete(`/users/${id}`);
export const getFacultyDetails = (id) => client.get(`/users/faculty/${id}/details`);
