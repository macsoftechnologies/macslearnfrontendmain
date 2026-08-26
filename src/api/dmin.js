import client from './client';

export const list = async (params) => {
  const { data } = await client.get('/dmin-evaluations', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/dmin-evaluations/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/dmin-evaluations', payload);
  return data;
};

export const evaluate = async (id, payload) => {
  const { data } = await client.put(`/dmin-evaluations/${id}/evaluate`, payload);
  return data;
};

export const remove = async (id) => {
  const { data } = await client.delete(`/dmin-evaluations/${id}`);
  return data;
};
