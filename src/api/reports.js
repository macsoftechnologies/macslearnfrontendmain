import client from './client';

export const overview = () => client.get('/reports/overview');
export const coursePerformance = () => client.get('/reports/course-performance');
export const studentActivity = () => client.get('/reports/student-activity');
export const superAdminOverview = () => client.get('/reports/super-admin/overview');
