import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Legacy / scaffold ────────────────────────────────────────────────────────

export const checkHealth = () => api.get('/health');
export const runPrediction = (payload) => api.post('/predict', payload);

// ── Task 2: File Upload ───────────────────────────────────────────────────────

/**
 * Upload a CSV file to the backend.
 * @param {File} file
 * @returns {Promise<{ session_id, filename, total_rows, total_columns, columns, preview }>}
 */
export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axios.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── Task 2: Session info ──────────────────────────────────────────────────────

/**
 * Fetch current session metadata + preview.
 * @param {string} sessionId
 */
export async function getSession(sessionId) {
  const res = await api.get(`/session/${sessionId}`);
  return res.data;
}

// ── Task 4 (stub): NL clean command ──────────────────────────────────────────

/**
 * Send a natural-language cleaning command to the backend.
 * Full implementation in Task 4 (Ollama classifier).
 * @param {string} sessionId
 * @param {string} command
 */
export async function cleanDataset(sessionId, command) {
  const res = await api.post('/clean', { session_id: sessionId, command });
  return res.data;
}

export default api;
