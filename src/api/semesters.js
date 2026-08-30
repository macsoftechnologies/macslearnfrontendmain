import client from './client';

export const list = async (params) => {
  const { data } = await client.get('/semesters', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/semesters/${id}`);
  return data.data;
};

export const create = async (payload) => {
  const { data } = await client.post('/semesters', payload);
  return data.data || data; // Handle depending on if there's a nested data wrapper
};

export const createBulk = async (payloadArray) => {
  const { data } = await client.post('/semesters/bulk', payloadArray);
  return data.data || data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/semesters/${id}`, payload);
  return data.data;
};

export const updateStatus = async (id, status) => {
  const { data } = await client.put(`/semesters/${id}`, { status });
  return data.data;
};

export const linkCourse = async (id, courseId, programId) => {
  const { data } = await client.post(`/semesters/${id}/courses/${courseId}/link`, { programId });
  return data.data;
};

export const unlinkCourse = async (id, courseId, programId) => {
  const { data } = await client.delete(`/semesters/${id}/courses/${courseId}/link?programId=${programId}`);
  return data.data;
};

export const remove = async (id) => {
  const { data } = await client.delete(`/semesters/${id}`);
  return data.data;
};

export const getSummary = async (id) => {
  const { data } = await client.get(`/semesters/${id}/summary`);
  return data;
};

export const executeRollover = async (id) => {
  const { data } = await client.post(`/semesters/${id}/rollover`);
  return data;
};

export const getStudentCyclicStatus = async (studentId, programId) => {
  const { data } = await client.get(`/semesters/student/${studentId}/cyclic-status`, {
    params: { programId },
  });
  return data;
};


export const progressStudents = async (id, payload = {}) => {
  const { data } = await client.post(`/semesters/${id}/progress-students`, payload);
  return data.data || data;
};
