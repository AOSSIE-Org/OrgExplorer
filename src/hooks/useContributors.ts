import { useState, useEffect } from 'react';
import { fetchOrgContributors } from '../lib/github';
import { useApp } from '../context/AppContext';
import type { Contributor } from '../types';
import type { RepoData } from '../types';

interface UseContributorsResult {
  contributors: Contributor[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
}

export function useContributors(orgName: string, repos: RepoData[]): UseContributorsResult {
  const { token, incrementApiCallCount } = useApp();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!orgName || !token || repos.length === 0) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchOrgContributors(orgName, token, repos, incrementApiCallCount)
      .then((result) => {
        if (cancelled) return;
        setContributors(result.data);
        setFromCache(result.fromCache);
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
  }, [orgName, token, repos.length]);

  return { contributors, loading, error, fromCache };
}
