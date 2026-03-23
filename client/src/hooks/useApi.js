import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useApi() {
  const { token, logout } = useAuth();

  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      }
    });
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired or unauthorized');
    }
    return res;
  }, [token, logout]);

  const get = useCallback(async (path) => {
    const res = await apiFetch(path);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }, [apiFetch]);

  const post = useCallback(async (path, body) => {
    const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    return res.json();
  }, [apiFetch]);

  const put = useCallback(async (path, body) => {
    const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
    return res.json();
  }, [apiFetch]);

  const patch = useCallback(async (path, body) => {
    const res = await apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }, [apiFetch]);

  const upload = useCallback(async (path, formData) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired or unauthorized');
    }
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }, [token, logout]);

  const del = useCallback(async (path, body) => {
    const res = await apiFetch(path, { method: 'DELETE', body: body ? JSON.stringify(body) : null });
    return res.json();
  }, [apiFetch]);

  return { apiFetch, get, post, put, patch, del, upload };
}
