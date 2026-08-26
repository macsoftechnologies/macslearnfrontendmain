import client from './client';

// Modules
export const listModules = (courseId) => client.get(`/courses/${courseId}/content/modules`);
export const createModule = (courseId, data) => client.post(`/courses/${courseId}/content/modules`, data);
export const updateModule = (courseId, moduleId, data) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}`, data);
export const deleteModule = (courseId, moduleId) =>
  client.delete(`/courses/${courseId}/content/modules/${moduleId}`);

// Lessons
export const listLessons = (courseId, moduleId) =>
  client.get(`/courses/${courseId}/content/modules/${moduleId}/lessons`);
export const createLesson = (courseId, moduleId, data, isMultipart) =>
  client.post(`/courses/${courseId}/content/modules/${moduleId}/lessons`, data,
    isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
export const updateLesson = (courseId, moduleId, lessonId, data) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}`, data);
export const deleteLesson = (courseId, moduleId, lessonId) =>
  client.delete(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}`);
export const approveModule = (courseId, moduleId) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}/approve`);
export const rejectModule = (courseId, moduleId, reason) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}/reject`, { reason });
export const approveLesson = (courseId, moduleId, lessonId) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}/approve`);
export const rejectLesson = (courseId, moduleId, lessonId, reason) =>
  client.patch(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}/reject`, { reason });
// Video Quiz Answers
export const submitVideoQuizAnswer = (courseId, moduleId, lessonId, quizId, payload) =>
  client.post(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}/video-quizzes/${quizId}/answers`, payload);

export const getVideoQuizAnswers = (courseId, moduleId, lessonId) =>
  client.get(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}/video-quizzes/answers`);

export const getMyVideoQuizAnswers = (courseId, moduleId, lessonId) =>
  client.get(`/courses/${courseId}/content/modules/${moduleId}/lessons/${lessonId}/video-quizzes/my-answers`);

export const gradeVideoQuizAnswer = (answerId, marks) =>
  client.post(`/courses/ignore/content/video-quizzes/answers/${answerId}/grade`, { marks });
