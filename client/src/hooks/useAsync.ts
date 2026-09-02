import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// ── Generic async data hook ───────────────────────────────────────

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'An error occurred';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, execute, setData };
}

// ── Mutation hook ─────────────────────────────────────────────────

export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options?: {
    onSuccess?: (data: TOutput) => void;
    /** Called with the plain error message string (for general toasts). */
    onError?: (error: string) => void;
    /**
     * Called with the full backend response data when available.
     * Use this to map structured field-level errors back into a form
     * via react-hook-form's setError().
     */
    onServerErrors?: (responseData: {
      message?: string;
      errors?: Array<{ field: string; message: string }>;
    }) => void;
    successMessage?: string;
  },
) {
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(async (input: TInput): Promise<TOutput | null> => {
    setLoading(true);
    try {
      const result = await mutationFn(input);
      if (options?.successMessage) toast.success(options.successMessage);
      options?.onSuccess?.(result);
      return result;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: { message?: string; errors?: Array<{ field: string; message: string }> };
        };
      };
      const responseData = axiosErr?.response?.data;
      const msg = responseData?.message || 'Operation failed';

      // Fire structured-error callback when the caller wants field-level errors
      if (options?.onServerErrors && responseData) {
        options.onServerErrors(responseData);
      } else {
        // Fall back to generic toast only when caller is not handling field errors
        toast.error(msg);
      }

      options?.onError?.(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options]);

  return { mutate, loading };
}

// ── Local storage hook ────────────────────────────────────────────

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setStoredValue] as const;
}

// ── Countdown timer hook ──────────────────────────────────────────

export function useCountdown(seconds: number, onComplete?: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  const start = useCallback(() => {
    setRemaining(seconds);
    setRunning(true);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, remaining]);

  return { remaining, running, start };
}
