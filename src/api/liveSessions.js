import client from './client';

export const list = async (params) => {
  const { data } = await client.get('/live-sessions', { params });
  return data;
};

export const getBatchRoster = async (batchId) => {
  const { data } = await client.get(`/live-sessions/batch/${batchId}/roster`);
  return data;
};

export const getUpcomingForStudent = async () => {
  const { data } = await client.get('/live-sessions/student/upcoming');
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/live-sessions', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/live-sessions/${id}`, payload);
  return data;
};

export const markAttendance = async (id, attendeeStudentIds) => {
  const { data } = await client.put(`/live-sessions/${id}/attendance`, { attendeeStudentIds });
  return data;
};

export const remove = async (id) => {
  const { data } = await client.delete(`/live-sessions/${id}`);
  return data;
};
