import client from './client';

export const list = async (params) => {
  const { data } = await client.get('/programs', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/programs/${id}`);
  return data.data;
};

export const create = async (payload) => {
  const { data } = await client.post('/programs', payload);
  return data.data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/programs/${id}`, payload);
  return data.data;
};

export const updateStatus = async (id, status) => {
  const { data } = await client.put(`/programs/${id}`, { status });
  return data.data;
};

export const remove = async (id) => {
  const { data } = await client.delete(`/programs/${id}`);
  return data.data;
};
