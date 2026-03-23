import api from './axios';

export const getRecommendedTasks = async (defectId) => {
  const res = await api.get(`/defects/${defectId}/recommendations`);
  return res.data;
};

export const getPlans = async (patientId) => {
  const res = await api.get(`/plans/patient/${patientId}`);
  return res.data;
};

export const createPlan = async (patientId, data) => {
  const res = await api.post(`/plans`, { patient_id: patientId, ...data });
  return res.data;
};

export const addAssignment = async (planId, taskId) => {
  const res = await api.post(`/plans/${planId}/assignments`, { task_id: taskId });
  return res.data;
};

export const approveAssignment = async (assignId) => {
  const res = await api.patch(`/plans/assignments/${assignId}/approve`);
  return res.data;
};

// ── V2 Endpoints ──

export const updatePlan = async (planId, data) => {
  const res = await api.patch(`/plans/${planId}`, data);
  return res.data;
};

export const updateAssignment = async (assignmentId, data) => {
  const res = await api.patch(`/plans/assignments/${assignmentId}`, data);
  return res.data;
};

export const deleteAssignment = async (assignmentId) => {
  const res = await api.delete(`/plans/assignments/${assignmentId}`);
  return res.data;
};
