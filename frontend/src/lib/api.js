import axios from 'axios';

const api = axios.create({
  // En prod, ne jamais dépendre de la variable Vercel : si elle manque au build,
  // tout le site pointerait vers localhost (panne du 17/07/2026).
  baseURL: import.meta.env.VITE_API_URL
    || (import.meta.env.PROD ? 'https://adoptly-backend-p2os.onrender.com/api' : 'http://localhost:3001/api'),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      ['token', 'user', 'role'].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
