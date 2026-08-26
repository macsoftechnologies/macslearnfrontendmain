import client from './client';

export const list = (params) => client.get('/payments', { params });
export const superAdminList = (params) => client.get('/payments/super-admin', { params });
export const myPayments = (params) => client.get('/payments/my-payments', { params });
export const generateInvoice = (id) => client.post(`/payments/${id}/generate-invoice`);
