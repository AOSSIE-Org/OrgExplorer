import { useCallback, useState } from 'react';
import { fetchOrg, fetchRateLimit } from '../lib/github';
import { useApp } from '../context/AppContext';
import type { OrgData } from '../types';

interface UseOrgResult {
  org: OrgData | null;
  loading: boolean;
  error: string | null;
  fetchOrgData: (name: string) => Promise<void>;
}

export function useOrg(): UseOrgResult {
  const { token, incrementApiCallCount, setLastDataSource, setRateLimit } = useApp();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgData = useCallback(
    async (name: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchOrg(name, token, incrementApiCallCount);
        setOrg(result.data);
        setLastDataSource(result.fromCache ? 'cache' : 'api');

        // Refresh rate limit after API call
        if (!result.fromCache) {
          const rl = await fetchRateLimit(token, incrementApiCallCount);
          setRateLimit(rl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organization');
      } finally {
        setLoading(false);
      }
    },
    [token, incrementApiCallCount, setLastDataSource, setRateLimit],
  );

  return { org, loading, error, fetchOrgData };
}
