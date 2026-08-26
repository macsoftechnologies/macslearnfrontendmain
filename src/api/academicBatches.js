import client from './client';

export const list = async (programId) => {
  const params = programId ? { programId } : {};
  const { data } = await client.get('/academic-batches', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/academic-batches/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/academic-batches', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/academic-batches/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  const { data } = await client.delete(`/academic-batches/${id}`);
  return data;
};
