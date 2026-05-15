import { useState, useEffect, useCallback } from 'react';
import { fetchOrgActivity } from '../lib/github';
import { getCacheTimestamp, cacheKey, deleteCache } from '../lib/cache';
import { useApp } from '../context/AppContext';
import type { OrgActivity } from '../types';
import type { RepoData } from '../types';

interface UseActivityResult {
  activity: OrgActivity | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  cachedAt: number | null;
  refresh: () => void;
}

export function useActivity(orgName: string, repos: RepoData[]): UseActivityResult {
  const { token, incrementApiCallCount } = useApp();
  const [activity, setActivity] = useState<OrgActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!orgName || !token || repos.length === 0) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchOrgActivity(orgName, token, repos, incrementApiCallCount)
      .then(async (result) => {
        if (cancelled) return;
        setActivity(result.data);
        setFromCache(result.fromCache);
        const ts = await getCacheTimestamp(cacheKey.activity(orgName));
        if (!cancelled) setCachedAt(ts);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgName, token, repos.length, tick]);

  const refresh = useCallback(async () => {
    await deleteCache(cacheKey.activity(orgName));
    setTick((t) => t + 1);
  }, [orgName]);

  return { activity, loading, error, fromCache, cachedAt, refresh };
}
