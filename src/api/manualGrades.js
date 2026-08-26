import client from './client';

export const listGrades = async (batchId, semesterId, courseId) => {
  const { data } = await client.get(`/manual-grades/${batchId}/${semesterId}/${courseId}`);
  return data;
};

export const saveGrades = async (batchId, semesterId, courseId, grades) => {
  const { data } = await client.post(`/manual-grades/${batchId}/${semesterId}/${courseId}`, { grades });
  return data.data;
};
