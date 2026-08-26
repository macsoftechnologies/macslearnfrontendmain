import client from './client';

export const list = (params) => client.get('/audit', { params });
