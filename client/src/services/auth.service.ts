import api from '../lib/axios';

export interface LoginPayload { email: string; password: string; }

export const authService = {
  login: async (data: LoginPayload) => {
    const res = await api.post('/auth/login', data);
    const { accessToken, user } = res.data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    return res.data.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data.data;
  },

  getCurrentUser: () => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated: () => !!localStorage.getItem('access_token'),

  hasRole: (role: string) => {
    const user = authService.getCurrentUser();
    return user?.role === role;
  },
};
