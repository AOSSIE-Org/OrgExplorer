import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FetchContributorActivityUseCase,
  GetContributorStatsUseCase,
  FilterContributorsUseCase,
  SearchContributorsUseCase,
  ExportContributorDataUseCase
} from './useCases';
import { ContributorMatrix } from './components/ContributorMatrix';
import { ContributorStats } from './components/ContributorStats';
import { ContributorFilters } from './components/ContributorFilters';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { GitHubTokenInput } from './components/GitHubTokenInput';
import { clearCache } from '../../lib/github/client';
import type { ContributorMatrixData } from '../../lib/github/types';

type SortBy = 'contributions' | 'prs' | 'issues' | 'merged';

interface FeatureProps {
  organization: string;
  defaultFromDate?: string;
}

const fetchUseCase = new FetchContributorActivityUseCase();
const statsUseCase = new GetContributorStatsUseCase();
const filterUseCase = new FilterContributorsUseCase();
const searchUseCase = new SearchContributorsUseCase();
const exportUseCase = new ExportContributorDataUseCase();

export const ContributorActivityFeature: React.FC<FeatureProps> = ({
  organization,
  defaultFromDate,
}) => {
  const [data, setData] = useState<ContributorMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenProvided, setTokenProvided] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    minContributions: number;
    repository: string;
    sortBy: SortBy;
  }>({
    minContributions: 0,
    repository: '',
    sortBy: 'contributions',
  });

  const fromDate = useMemo(() => {
    if (defaultFromDate) return defaultFromDate;
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }, [defaultFromDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchUseCase.execute(organization, fromDate);
      setData(result);
      setCacheCleared(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch contributor activity';
      
      if (message.includes('rate limit')) {
        setError(`${message}\n\nTip: Add a GitHub token for higher rate limits (60 → 5000 requests/hour)`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [organization, fromDate]);

  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    setTokenProvided(!!savedToken);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTokenChange = useCallback((token: string) => {
    setTokenProvided(!!token);
    clearCache();
    loadData();
  }, [loadData]);

  const handleClearCache = useCallback(() => {
    clearCache();
    setCacheCleared(true);
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    if (!data) return null;
    return statsUseCase.execute(data);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    
    let result = filterUseCase.execute(data, filters);
    
    if (searchQuery) {
      const searchResults = searchUseCase.execute(data, searchQuery);
      const searchLogins = new Set(searchResults.map((c: { login: string }) => c.login));
      result = {
        ...result,
        contributors: result.contributors.filter(c => searchLogins.has(c.login)),
      };
    }
    
    return result;
  }, [data, filters, searchQuery]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!data) return;
    
    const content = exportUseCase.execute(data, format);
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contributor-activity-${organization}-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="contributor-activity-feature">
      <GitHubTokenInput onTokenChange={handleTokenChange} />
      
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : !data || !filteredData ? (
        <ErrorState message="No data available" onRetry={loadData} />
      ) : (
        <>
          <div className="feature-header">
            <h1>Contributor Activity Matrix</h1>
            <p>
              Tracking activity for <strong>{organization}</strong> since {fromDate}
              {!tokenProvided && <span className="rate-limit-warning"> (Add token for more data)</span>}
              {cacheCleared && <span className="cache-cleared"> Cache cleared!</span>}
            </p>
          </div>
          
          <div className="header-actions">
            <button onClick={handleClearCache} className="btn-clear-cache">
              Clear Cache
            </button>
          </div>
          
          {stats && <ContributorStats stats={stats} />}
          
          <ContributorFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            repositories={data.repositories}
            onRefresh={handleRefresh}
            onExport={handleExport}
          />
          
          <ContributorMatrix
            data={filteredData}
            allRepositories={data.repositories}
          />
        </>
      )}
    </div>
  );
};

export default ContributorActivityFeature;
