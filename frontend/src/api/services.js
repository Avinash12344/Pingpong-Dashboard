import { api } from './config';

export const fetchServiceStatus = async () => {
  const response = await api.get('/api/status');
  return response.data;
};

export const fetchServiceHistory = async (limit = 20) => {
  const response = await api.get(`/api/status/history?limit=${limit}`);
  return response.data;
};

export const fetchMetrics = async () => {
  const response = await api.get('/api/metrics');
  return response.data;
};

export const triggerHealthCheck = async () => {
  const response = await api.post('/api/check');
  return response.data;
};