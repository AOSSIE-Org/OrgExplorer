interface ContributorFiltersProps {
  filters: {
    minContributions: number;
    repository: string;
    sortBy: 'contributions' | 'prs' | 'issues' | 'merged';
  };
  onFilterChange: (filters: ContributorFiltersProps['filters']) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  repositories: string[];
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json') => void;
}

export const ContributorFilters: React.FC<ContributorFiltersProps> = ({
  filters,
  onFilterChange,
  searchQuery,
  onSearchChange,
  repositories,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="contributor-filters">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search contributors..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="filter-group">
        <label>
          Min Contributions:
          <input
            type="number"
            min="0"
            value={filters.minContributions}
            onChange={(e) => onFilterChange({ ...filters, minContributions: parseInt(e.target.value) || 0 })}
          />
        </label>
        
        <label>
          Repository:
          <select
            value={filters.repository}
            onChange={(e) => onFilterChange({ ...filters, repository: e.target.value })}
          >
            <option value="">All Repositories</option>
            {repositories.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
        </label>
        
        <label>
          Sort By:
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as typeof filters.sortBy })}
          >
            <option value="contributions">Total Contributions</option>
            <option value="prs">Pull Requests</option>
            <option value="issues">Issues</option>
            <option value="merged">Merged PRs</option>
          </select>
        </label>
      </div>
      
      <div className="actions">
        <button onClick={onRefresh} className="btn-refresh">
          Refresh
        </button>
        <button onClick={() => onExport('csv')} className="btn-export">
          Export CSV
        </button>
        <button onClick={() => onExport('json')} className="btn-export">
          Export JSON
        </button>
      </div>
    </div>
  );
};
