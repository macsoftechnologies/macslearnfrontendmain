import client from './client';

export const getDashboardStats = () => client.get('/faculty/dashboard-stats');
export const getGradingQueue = () => client.get('/faculty/grading-queue');
