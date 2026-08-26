// import client from './client';

// export const uploadFile = (file, onProgress) => {
//   const formData = new FormData();
//   formData.append('file', file);
//   return client.post('/upload', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     onUploadProgress: (evt) => {
//       if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
//     },
//   });
// };

import client from './client';

// We added the folder parameter, defaulting to 'students'
export const uploadFile = (file, onProgress, folder = 'students', isPublic = false) => {
  const formData = new FormData();
  formData.append('file', file);
  // We attach the folder to the URL so the backend knows where to put it
  const endpoint = isPublic ? `/upload/public?folder=${folder}` : `/upload?folder=${folder}`;
  return client.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
};
