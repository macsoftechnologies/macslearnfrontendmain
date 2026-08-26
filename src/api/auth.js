import client from './client';

export const login = (credentials) => client.post('/auth/login', credentials);

export const superAdminLogin = (credentials) =>
  client.post('/auth/super-admin/login', credentials);

export const register = (data) => client.post('/auth/register', data);

export const logout = (refreshToken) => client.post('/auth/logout', { refreshToken });

export const refresh = (refreshToken) =>
  client.post('/auth/refresh-token', { refreshToken });

export const changePassword = (data) => client.post('/auth/change-password', data);
