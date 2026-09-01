import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setTokens, clearTokens, getRefreshToken } from '../utils/tokenStorage';
import * as usersApi from '../api/users';
import * as authApi from '../api/auth';
import { buildStaticUrl } from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const ROLE_HOME = {
  SUPER_ADMIN: '/super-admin/dashboard',
  ORG_USER: '/admin/dashboard',
  FACULTY: '/faculty/dashboard',
  STUDENT: '/student/dashboard',
  FINANCE: '/finance/dashboard',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((data) => {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    // Normalize: always expose permissions from either JWT `permissions` or DB `modulePermissions`
    const rawUser = data.user;
    const normalizedUser = {
      ...rawUser,
      permissions: rawUser.permissions || rawUser.modulePermissions || [],
    };
    setUser(normalizedUser);
    setRole(normalizedUser.userType);
    const uId = normalizedUser.id || normalizedUser.userId || normalizedUser._id;
    if (uId) {
      localStorage.setItem('authUserId', uId);
    }
    if (normalizedUser.organizationSlug) {
      localStorage.setItem('orgSlug', normalizedUser.organizationSlug);
    }
    if (normalizedUser.organizationName) {
      localStorage.setItem('orgName', normalizedUser.organizationName);
    } else if (normalizedUser.userType === 'SUPER_ADMIN') {
      localStorage.setItem('orgName', 'MacsLearn');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const rt = getRefreshToken();
    if (!rt) {
      setLoading(false);
      return;
    }
    authApi
      .refresh(rt)
      .then(async (res) => {
        const data = res.data.data;
        if (!data.user) {
          let decoded = null;
          try {
            const base64 = data.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            decoded = JSON.parse(jsonPayload);
          } catch (e) {}

          setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          
          if (decoded && (decoded.userType === 'SUPER_ADMIN' || decoded.role === 'SUPER_ADMIN')) {
            data.user = { 
              id: decoded.id || decoded._id, 
              userType: 'SUPER_ADMIN', 
              email: decoded.email,
              fullName: decoded.fullName,
              permissions: decoded.permissions 
            };
          } else {
            try {
              const userRes = await usersApi.getMe();
              data.user = userRes.data.data;
            } catch (err) {
              if (decoded) {
                data.user = { id: decoded.id || decoded._id, userType: decoded.userType || decoded.role, email: decoded.email };
              } else {
                throw err;
              }
            }
          }
        }
        applyAuth(data);
      })
      .catch(() => {
        clearTokens();
        setLoading(false);
      });
  }, [applyAuth]);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    applyAuth(data.data);
    return data.data.user.userType;
  };

  const superAdminLogin = async (credentials) => {
    const { data } = await authApi.superAdminLogin(credentials);
    applyAuth(data.data);
    return data.data.user.userType;
  };

  const logout = async () => {
    let logoutUrl = '/login';
    const slug = localStorage.getItem('orgSlug');
    if (role === 'SUPER_ADMIN') {
      logoutUrl = '/super-admin/login';
    } else if (slug) {
      logoutUrl = `/${slug}/login`;
    }

    try {
      await authApi.logout(getRefreshToken());
    } catch {
      /* ignore */
    }
    clearTokens();
    localStorage.removeItem('orgSlug');
    localStorage.removeItem('orgName');
    setUser(null);
    setRole(null);
    // window.location.href = logoutUrl;
    window.location.href = `/macslearnfrontend${logoutUrl}`;
  };

  const updateUser = (patch) => setUser((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    if (user?.organizationLogo) {
      link.href = buildStaticUrl(user.organizationLogo);
    } else {
      link.href = '/favicon.svg';
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, role, loading, login, superAdminLogin, logout, updateUser, homeFor: (r) => ROLE_HOME[r] || '/login' }}
    >
      {children}
    </AuthContext.Provider>
  );
}
