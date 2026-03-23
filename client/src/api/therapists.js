import api from './axios';

export const getMe = async () => {
  const res = await api.get(`/therapist/profile`);
  return res.data;
};

export const updateMe = async (data) => {
  const res = await api.patch(`/therapist/profile`, data);
  return res.data;
};

export const getCode = async () => {
  const res = await api.get(`/therapist/code`);
  return res.data;
};

export const regenerateCode = async () => {
  const res = await api.post(`/therapist/code/regenerate`);
  return res.data;
};
