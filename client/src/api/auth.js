const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const authAPI = {
  therapistLogin: async (credentials) => {
    const res = await fetch(`${API_URL}/auth/therapist/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Login failed');
    }
    return res.json();
  },

  therapistRegister: async (data) => {
    const res = await fetch(`${API_URL}/auth/therapist/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Registration failed');
    }
    return res.json();
  },

  patientLogin: async (credentials) => {
    const res = await fetch(`${API_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Login failed');
    }
    return res.json();
  },

  patientRegister: async (data) => {
    const res = await fetch(`${API_URL}/auth/patient/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Registration failed');
    }
    return res.json();
  }
};
