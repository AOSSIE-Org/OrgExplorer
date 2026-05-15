import { useMemo, useState } from 'react';
import type { RepoData } from '../../types';
import { getLanguageColor } from '../../lib/github';

interface Props {
  repos: RepoData[];
}

type SortKey = 'name' | 'stargazers_count' | 'forks_count' | 'open_issues_count' | 'updated_at';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo. ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function RepoTable({ repos }: Props) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stargazers_count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [langFilter, setLangFilter] = useState('');

  const languages = useMemo(() => {
    const set = new Set<string>();
    repos.forEach((r) => { if (r.language) set.add(r.language); });
    return ['', ...Array.from(set).sort()];
  }, [repos]);

  const sorted = useMemo(() => {
    let list = repos.filter((r) => {
      const matchName = r.name.toLowerCase().includes(filter.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(filter.toLowerCase());
      const matchLang = !langFilter || r.language === langFilter;
      return matchName && matchLang;
    });

    list = [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [repos, filter, sortKey, sortDir, langFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="repo-table-container">
      <div className="repo-table-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="repo-table-filter"
            type="text"
            placeholder="Filter repositories…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            className="repo-table-filter"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            style={{ width: 140 }}
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l || 'All languages'}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {sorted.length} of {repos.length} repositories
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="repo-table">
          <thead>
            <tr>
              <th className={sortKey === 'name' ? 'sorted' : ''} onClick={() => handleSort('name')}>
                Repository{sortIcon('name')}
              </th>
              <th style={{ width: 100 }} className={sortKey === 'stargazers_count' ? 'sorted' : ''} onClick={() => handleSort('stargazers_count')}>
                ⭐ Stars{sortIcon('stargazers_count')}
              </th>
              <th style={{ width: 90 }} className={sortKey === 'forks_count' ? 'sorted' : ''} onClick={() => handleSort('forks_count')}>
                🍴 Forks{sortIcon('forks_count')}
              </th>
              <th style={{ width: 130 }}>Language</th>
              <th style={{ width: 100 }} className={sortKey === 'open_issues_count' ? 'sorted' : ''} onClick={() => handleSort('open_issues_count')}>
                Issues{sortIcon('open_issues_count')}
              </th>
              <th style={{ width: 120 }} className={sortKey === 'updated_at' ? 'sorted' : ''} onClick={() => handleSort('updated_at')}>
                Updated{sortIcon('updated_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state" style={{ padding: '30px 24px' }}>
                    <span className="empty-state__title">No repositories found</span>
                    <span className="empty-state__desc">Try adjusting your filter.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((repo) => (
                <tr key={repo.id}>
                  <td>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-table__name"
                    >
                      {repo.name}
                    </a>
                    {repo.archived && (
                      <span className="badge badge--gray" style={{ marginLeft: 6, fontSize: 10 }}>
                        archived
                      </span>
                    )}
                    {repo.fork && (
                      <span className="badge badge--gray" style={{ marginLeft: 4, fontSize: 10 }}>
                        fork
                      </span>
                    )}
                    {repo.description && (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, maxWidth: 400 }}>
                        {repo.description.length > 90
                          ? `${repo.description.slice(0, 90)}…`
                          : repo.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {repo.stargazers_count.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {repo.forks_count.toLocaleString()}
                  </td>
                  <td>
                    {repo.language ? (
                      <span>
                        <span
                          className="lang-dot"
                          style={{ background: getLanguageColor(repo.language) }}
                        />
                        {repo.language}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {repo.open_issues_count > 0 ? (
                      <span style={{ color: repo.open_issues_count > 10 ? 'var(--warning-fg)' : 'inherit' }}>
                        {repo.open_issues_count}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--fg-subtle)' }}>0</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                    {formatDate(repo.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
