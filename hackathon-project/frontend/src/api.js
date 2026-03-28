import axios from 'axios';

const SESSION_KEY = 'nl_cleaner_auth';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from sessionStorage on every request (if present)
api.interceptors.request.use((config) => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

// ── Health / scaffold ─────────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health');
export const runPrediction = (payload) => api.post('/predict', payload);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authRegister = (email, password) =>
  api.post('/auth/register', { email, password }).then((r) => r.data);

export const authLogin = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

// ── File upload ───────────────────────────────────────────────────────────────
export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── Session ───────────────────────────────────────────────────────────────────
export async function getSession(sessionId) {
  const res = await api.get(`/session/${sessionId}`);
  return res.data;
}

// ── History ───────────────────────────────────────────────────────────────────
export async function getHistory() {
  const res = await api.get('/history');
  return res.data;
}

// ── NL clean command ──────────────────────────────────────────────────────────
export async function cleanDataset(sessionId, command) {
  const res = await api.post('/clean', { session_id: sessionId, command });
  return res.data;
}

export default api;
