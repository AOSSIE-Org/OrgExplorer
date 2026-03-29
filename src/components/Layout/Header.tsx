import { type FormEvent, useState } from 'react';
import { useApp } from '../../context/AppContext';
import RateLimitBar from '../Dashboard/RateLimitBar';

interface HeaderProps {
  onSearch: (orgName: string) => void;
  loading?: boolean;
  currentOrg?: string;
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export default function Header({ onSearch, loading, currentOrg }: HeaderProps) {
  const { rateLimit, lastDataSource } = useApp();
  const [query, setQuery] = useState(currentOrg ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  };

  const dataSourceLabel =
    lastDataSource === 'cache' ? (
      <span className="cache-badge cache-badge--cached" title="Data served from IndexedDB cache">
        ⚡ Cached
      </span>
    ) : lastDataSource === 'api' ? (
      <span className="cache-badge cache-badge--api" title="Data fetched from GitHub API">
        🌐 Live
      </span>
    ) : null;

  return (
    <header className="header">
      <form className="header__search-form" onSubmit={handleSubmit}>
        <input
          className="header__search-input"
          type="text"
          placeholder="Search organization (e.g. aossie, microsoft)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={loading || !query.trim()}
        >
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <SearchIcon />}
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="header__actions">
        {dataSourceLabel}
        {rateLimit && <RateLimitBar rateLimit={rateLimit} />}
      </div>
    </header>
  );
}
