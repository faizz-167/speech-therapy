const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const patientsAPI = {
  getPatients: async (therapistId) => {
    const url = therapistId ? `${API_URL}/patients?therapist_id=${therapistId}` : `${API_URL}/patients`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  getPatient: async (id) => {
    const res = await fetch(`${API_URL}/patients/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch patient');
    return res.json();
  },

  deletePatient: async (id) => {
    const res = await fetch(`${API_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete patient');
    return res.json();
  },

  getNotes: async (id) => {
    const res = await fetch(`${API_URL}/patients/${id}/notes`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  saveNotes: async (id, notes) => {
    const res = await fetch(`${API_URL}/patients/${id}/notes`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error('Failed to save notes');
    return res.json();
  },

  addNote: async (id, noteData) => {
    const res = await fetch(`${API_URL}/patients/${id}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(noteData)
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  getAlerts: async (therapistId) => {
    const res = await fetch(`${API_URL}/progress/clinician/alerts?therapist_id=${therapistId}`, { headers: getHeaders() });
    if (!res.ok) return []; // Gracefully handle missing endpoint
    return res.json();
  },

  getBaselineResults: async (patientId) => {
    const res = await fetch(`${API_URL}/patients/baseline-results?patient_id=${patientId}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  getProgress: async (patientId) => {
    const res = await fetch(`${API_URL}/progress/patients/${patientId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  getEmotionTrends: async (patientId, days = 30) => {
    const res = await fetch(`${API_URL}/patients/${patientId}/emotion-trends?days=${days}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch emotions');
    return res.json();
  },

  getStreak: async (patientId) => {
    const res = await fetch(`${API_URL}/patients/${patientId}/streak`, { headers: getHeaders() });
    if (!res.ok) return { current_streak: 0, longest_streak: 0 };
    return res.json();
  }
};
