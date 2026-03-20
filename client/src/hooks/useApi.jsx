import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useApi = () => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      
      const config = {
        url: `${API_BASE_URL}${endpoint}`,
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        },
        data: options.data
      };

      const response = await axios(config);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    }
  }, [getToken]);

  return { request, loading, error };
};
