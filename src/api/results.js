import client from './client';

export const myResults = () => client.get('/results/student');
export const myAttempts = () => client.get('/results/student/attempts');
export const myVideoQuizzes = () => client.get('/results/student/video-quizzes');
export const courseResults = (courseId) => client.get(`/results/courses/${courseId}`);
