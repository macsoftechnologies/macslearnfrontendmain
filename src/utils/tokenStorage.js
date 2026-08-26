// Access token lives only in memory (module-level var) — never persisted.
// Refresh token lives in localStorage so a session survives a page reload
// and browser restarts.

let _accessToken = null;

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) _accessToken = accessToken;
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const getAccessToken = () => _accessToken;

export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const clearTokens = () => {
  _accessToken = null;
  localStorage.removeItem('refreshToken');
};
