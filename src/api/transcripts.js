import client from './client';

export const generate = async (studentId, metadata = {}) => {
  const { data } = await client.post(
    `/transcripts/generate/${studentId}`, 
    metadata,
    { responseType: 'blob' }
  );
  return data;
};
export const getMyGrades = async () => {
  const { data } = await client.get(`/transcripts/my-grades`);
  return data;
};
