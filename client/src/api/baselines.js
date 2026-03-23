import api from './axios';

export const getAssessments = async () => {
  const res = await api.get('/baselines');
  return res.data;
};

export const getAssessmentSections = async (id) => {
  const res = await api.get(`/baselines/${id}/sections`);
  return res.data;
};

export const openAssessment = async (patientId, baselineId) => {
  const res = await api.post(`/patients/${patientId}/baseline-results`, { baseline_id: baselineId, items: [] });
  return res.data;
};

export const submitItemAudio = async (formData) => {
  const res = await api.post('/patients/item-results', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const completeAssessment = async (resultId) => {
  const res = await api.post(`/baselines/results/${resultId}/complete`);
  return res.data;
};
