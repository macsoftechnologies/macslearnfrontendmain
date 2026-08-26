import client from './client';

export const list = (params) => client.get('/transactions', { params });
export const myTransactions = (params) => client.get('/transactions/me', { params });
