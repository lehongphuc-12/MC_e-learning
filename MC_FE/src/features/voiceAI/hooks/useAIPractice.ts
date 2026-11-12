import { useState } from 'react';
import { aiPracticeApi } from '../api/aiPracticeApi';
import type { AIPracticeResult } from '../types/aiPracticeTypes';

export function useAIPractice() {
  const [result, setResult] = useState<AIPracticeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (courseId: number, lessonId: number, file: File, expectedText?: string) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await aiPracticeApi.submit(courseId, lessonId, file, expectedText);
      setResult(data); return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phân tích âm thanh.');
      return null;
    } finally { setLoading(false); }
  };
  return { result, loading, error, submit, reset: () => { setResult(null); setError(null); } };
}