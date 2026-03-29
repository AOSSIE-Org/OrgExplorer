import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AppState, DataSource, RateLimit } from '../types';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [lastDataSource, setLastDataSource] = useState<DataSource>('none');
  const callCountRef = useRef(0);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (!t) {
      // Reset counters on logout
      setApiCallCount(0);
      callCountRef.current = 0;
      setRateLimit(null);
      setLastDataSource('none');
    }
  }, []);

  const incrementApiCallCount = useCallback(() => {
    callCountRef.current += 1;
    setApiCallCount(callCountRef.current);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      token,
      setToken,
      rateLimit,
      setRateLimit,
      apiCallCount,
      incrementApiCallCount,
      lastDataSource,
      setLastDataSource,
    }),
    [token, setToken, rateLimit, apiCallCount, incrementApiCallCount, lastDataSource],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
