import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const checkHealth = () => api.get('/health');

export const runPrediction = (payload) => api.post('/predict', payload);

export default api;
