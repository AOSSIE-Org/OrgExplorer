import { useCallback, useState } from 'react';
import { fetchRepos, aggregateLanguages, fetchRateLimit } from '../lib/github';
import { useApp } from '../context/AppContext';
import type { LanguageStat, RepoData } from '../types';

interface UseReposResult {
  repos: RepoData[];
  languages: LanguageStat[];
  loading: boolean;
  error: string | null;
  fetchRepoData: (orgName: string) => Promise<void>;
}

export function useRepos(): UseReposResult {
  const { token, incrementApiCallCount, setLastDataSource, setRateLimit } = useApp();
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [languages, setLanguages] = useState<LanguageStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepoData = useCallback(
    async (orgName: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchRepos(orgName, token, incrementApiCallCount);
        setRepos(result.data);
        setLanguages(aggregateLanguages(result.data));
        setLastDataSource(result.fromCache ? 'cache' : 'api');

        if (!result.fromCache) {
          const rl = await fetchRateLimit(token, incrementApiCallCount);
          setRateLimit(rl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
      } finally {
        setLoading(false);
      }
    },
    [token, incrementApiCallCount, setLastDataSource, setRateLimit],
  );

  return { repos, languages, loading, error, fetchRepoData };
}
