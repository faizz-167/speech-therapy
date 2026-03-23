import { useState, useCallback } from 'react';
import { getQueue } from '../api/sessions';

export const useSessionQueue = (sessionId) => {
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQueue(sessionId);
      setPrompts(data);
      setCurrentIndex(0);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load session queue.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const nextPrompt = useCallback(() => {
    if (currentIndex < prompts.length) {
      setCurrentIndex(prev => prev + 1);
      return true;
    }
    return false;
  }, [currentIndex, prompts.length]);

  return {
    prompts,
    currentPrompt: prompts[currentIndex] || null,
    currentIndex,
    totalPrompts: prompts.length,
    isComplete: prompts.length > 0 && currentIndex >= prompts.length,
    loading,
    error,
    fetchQueue,
    nextPrompt
  };
};
