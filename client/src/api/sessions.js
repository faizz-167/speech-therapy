import api from './axios';

export const getQueue = async (sessionId) => {
  const res = await api.get(`/sessions/${sessionId}/queue`);
  return res.data;
};

export const submitAttempt = async (sessionId, promptId, formData) => {
  const res = await api.post(`/sessions/${sessionId}/prompts/${promptId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const completeSession = async (sessionId) => {
  const res = await api.post(`/sessions/${sessionId}/complete`);
  return res.data;
};
