import api from '../lib/axios';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Token expired
    }
    return true;
  } catch {
    return false;
  }
}

export const authService = {
  getToken: (): string | null => {
    const sessionToken = sessionStorage.getItem('access_token');
    if (sessionToken) {
      if (isTokenValid(sessionToken)) return sessionToken;
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user');
    }

    const localToken = localStorage.getItem('access_token');
    if (localToken) {
      if (isTokenValid(localToken)) return localToken;
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_remember_me');
    }

    return null;
  },

  login: async (data: LoginPayload) => {
    const res = await api.post('/auth/login', {
      email: data.email,
      password: data.password,
    });
    const { accessToken, user } = res.data.data;

    // Reset old tokens across both stores
    authService.clearTokens();

    if (data.rememberMe) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('auth_remember_me', 'true');
    } else {
      sessionStorage.setItem('access_token', accessToken);
      sessionStorage.setItem('user', JSON.stringify(user));
    }

    return res.data.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      authService.clearTokens();
    }
  },

  clearTokens: () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_remember_me');
  },

  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data.data;
  },

  getCurrentUser: () => {
    if (!authService.isAuthenticated()) return null;
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },

  hasRole: (role: string): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === role;
  },
};

// Clear legacy persistent credentials from previous development sessions
// so the user is forced to log in fresh unless they explicitly chose rememberMe
if (typeof window !== 'undefined') {
  const hasLocal = localStorage.getItem('access_token');
  const hasRememberMe = localStorage.getItem('auth_remember_me');
  if (hasLocal && !hasRememberMe) {
    authService.clearTokens();
  }
}
