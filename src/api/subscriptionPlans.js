import client from './client';

export const list = () => client.get('/subscription-plans');
export const getById = (id) => client.get(`/subscription-plans/${id}`);
export const create = (data) => client.post('/subscription-plans', data);
export const update = (id, data) => client.patch(`/subscription-plans/${id}`, data);
export const remove = (id) => client.delete(`/subscription-plans/${id}`);
