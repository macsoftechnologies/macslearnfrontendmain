import client from './client';

export const create = (courseId, data) => client.post(`/courses/${courseId}/exams`, data);
export const list = (courseId, params) => client.get(`/courses/${courseId}/exams`, { params });
export const getById = (examId) => client.get(`/exams/${examId}`);
export const publish = (examId) => client.patch(`/exams/${examId}/publish`);
export const approve = (examId) => client.patch(`/exams/${examId}/approve`);
export const reject = (examId, reason) => client.patch(`/exams/${examId}/reject`, { reason });
export const addQuestion = (examId, data) => client.post(`/exams/${examId}/questions`, data);
export const listQuestions = (examId) => client.get(`/exams/${examId}/questions`);
export const updateQuestion = (examId, questionId, data) =>
  client.patch(`/exams/${examId}/questions/${questionId}`, data);
export const deleteQuestion = (examId, questionId) =>
  client.delete(`/exams/${examId}/questions/${questionId}`);
export const start = (examId) => client.post(`/exams/${examId}/start`);
export const saveAnswers = (examId, data) => client.patch(`/exams/${examId}/answers`, data);
export const submit = (examId, data) => client.post(`/exams/${examId}/submit`, data);
export const myResult = (examId) => client.get(`/exams/${examId}/my-result`);
export const results = (examId, params) => client.get(`/exams/${examId}/results`, { params });
export const attempts = (examId) => client.get(`/exams/${examId}/attempts`);
export const shortAnswers = (examId, attemptId) =>
  client.get(`/exams/${examId}/attempts/${attemptId}/shortanswers`);
export const attemptReview = (examId, attemptId) =>
  client.get(`/exams/${examId}/attempts/${attemptId}/review`);
export const gradeAnswer = (examId, attemptId, data) =>
  client.patch(`/exams/${examId}/attempts/${attemptId}/grade-answer`, data);
export const publishResult = (resultId) => client.patch(`/results/${resultId}/publish`);
