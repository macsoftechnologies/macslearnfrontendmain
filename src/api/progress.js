import client from './client';

export const completeLesson = (lessonId, courseId, moduleId) =>
  client.post(`/progress/lessons/${lessonId}/complete`, { courseId, moduleId });

export const updateWatchTime = (lessonId, courseId, moduleId, watchedSeconds) =>
  client.patch(`/progress/lessons/${lessonId}/watch-time`, { courseId, moduleId, watchedSeconds });

export const getCourseProgress = (courseId) =>
  client.get(`/progress/courses/${courseId}`);
export const getAllStudentsProgress = (courseId) => client.get(`/progress/courses/${courseId}/students`);
export const getStudentDetail = (courseId, studentId) =>
  client.get(`/progress/courses/${courseId}/students/${studentId}`);
