import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Avoid redirecting to therapist login if the 401 came from a patient endpoint
    const isPatientEndpoint = error.config?.url?.includes('/patients/');
    
    if (!isPatientEndpoint && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('token');
      window.location.href = '/';
    } else if (error.response?.status === 422) {
      toast.error("Invalid submission format");
    }
    return Promise.reject(error);
  }
);

export default api;
