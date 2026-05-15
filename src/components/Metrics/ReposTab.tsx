import { useCallback, useMemo, useRef, useState } from 'react';
import type { RepoData, RepoHealth } from '../../types';
import { getLanguageColor, getRepoHealth, searchOrgRepos } from '../../lib/github';

interface Props {
  repos: RepoData[];
  onRepoClick: (repo: RepoData) => void;
  orgName: string;
  token: string;
}

type SortKey = 'name' | 'stargazers_count' | 'forks_count' | 'open_issues_count' | 'pushed_at';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const HEALTH_COLORS: Record<RepoHealth, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(63,185,80,0.15)', text: '#3fb950', label: 'Active' },
  stale:  { bg: 'rgba(210,153,34,0.15)', text: '#d2961e', label: 'Stale'  },
  dead:   { bg: 'rgba(248,81,73,0.15)',  text: '#f85149', label: 'Dead'   },
};

function HealthBadge({ health }: { health: RepoHealth }) {
  const s = HEALTH_COLORS[health];
  return (
    <span style={{
      background: s.bg,
      color: s.text,
      border: `1px solid ${s.text}40`,
      borderRadius: 12,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export default function ReposTab({ repos, onRepoClick, orgName, token }: Props) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stargazers_count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [healthFilter, setHealthFilter] = useState<RepoHealth | ''>('');

  // GitHub search state
  const [ghMode, setGhMode] = useState(false);
  const [ghQuery, setGhQuery] = useState('');
  const [ghResults, setGhResults] = useState<RepoData[]>([]);
  const [ghTotal, setGhTotal] = useState(0);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');
  const ghInputRef = useRef<HTMLInputElement>(null);

  const enterGhMode = useCallback(() => {
    setGhMode(true);
    setGhQuery('');
    setGhResults([]);
    setGhTotal(0);
    setGhError('');
    setTimeout(() => ghInputRef.current?.focus(), 50);
  }, []);

  const exitGhMode = useCallback(() => {
    setGhMode(false);
    setGhQuery('');
    setGhResults([]);
  }, []);

  const runGhSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setGhLoading(true);
    setGhError('');
    try {
      const r = await searchOrgRepos(orgName, q.trim(), token);
      setGhResults(r.items);
      setGhTotal(r.totalCount);
    } catch (err) {
      setGhError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setGhLoading(false);
    }
  }, [orgName, token]);

  const handleGhSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void runGhSearch(ghQuery);
  }, [ghQuery, runGhSearch]);

  const sorted = useMemo(() => {
    let list = repos.filter((r) => {
      const matchName = r.name.toLowerCase().includes(filter.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(filter.toLowerCase());
      const matchHealth = !healthFilter || getRepoHealth(r) === healthFilter;
      return matchName && matchHealth;
    });

    list = [...list].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [repos, filter, sortKey, sortDir, healthFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const si = (key: SortKey) => sortKey !== key ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

  // Health summary counts
  const healthCounts = useMemo(() => {
    const c: Record<RepoHealth, number> = { active: 0, stale: 0, dead: 0 };
    repos.forEach((r) => { c[getRepoHealth(r)]++; });
    return c;
  }, [repos]);

  return (
    <div>
      {/* Cap warning — shown only when org likely has more than 1000 repos */}
      {repos.length >= 1000 && (
        <div style={{
          background: 'rgba(210,153,34,0.1)',
          border: '1px solid rgba(210,153,34,0.35)',
          color: '#d2961e',
          borderRadius: 'var(--radius)',
          padding: '9px 14px',
          fontSize: 12,
          marginBottom: 14,
        }}>
          ⚠️ Showing the 1,000 most recently updated repositories. This organisation may have more.
        </div>
      )}

      {/* Health summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['active', 'stale', 'dead'] as RepoHealth[]).map((h) => (
          <button
            key={h}
            onClick={() => setHealthFilter(healthFilter === h ? '' : h)}
            style={{
              background: healthFilter === h ? HEALTH_COLORS[h].bg : 'var(--bg-elevated)',
              color: healthFilter === h ? HEALTH_COLORS[h].text : 'var(--fg-muted)',
              border: `1px solid ${healthFilter === h ? HEALTH_COLORS[h].text : 'var(--border-default)'}`,
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {h} <span style={{ fontWeight: 400 }}>({healthCounts[h]})</span>
          </button>
        ))}
      </div>

      <div className="repo-table-container">
        {/* Toolbar */}
        {!ghMode ? (
          <div className="repo-table-toolbar">
            <input
              className="repo-table-filter"
              type="text"
              placeholder="Filter loaded repositories…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              onClick={enterGhMode}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius)',
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔍 Search all repos
            </button>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {sorted.length} of {repos.length}
            </span>
          </div>
        ) : (
          <form onSubmit={handleGhSubmit} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input
              ref={ghInputRef}
              className="repo-table-filter"
              type="text"
              placeholder={`Search all repos in ${orgName || 'this org'} on GitHub…`}
              value={ghQuery}
              onChange={(e) => setGhQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={ghLoading || !ghQuery.trim()}
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
                borderRadius: 'var(--radius)',
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: ghLoading ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: !ghQuery.trim() ? 0.5 : 1,
              }}
            >
              {ghLoading ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              onClick={exitGhMode}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-muted)',
                borderRadius: 'var(--radius)',
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Back to local
            </button>
            {ghResults.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                {ghResults.length} of ~{ghTotal.toLocaleString()} GitHub results
              </span>
            )}
          </form>
        )}
        {ghError && (
          <div style={{ color: '#f85149', fontSize: 12, marginBottom: 8, padding: '6px 10px', background: 'rgba(248,81,73,0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,81,73,0.3)' }}>
            ⚠ {ghError}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="repo-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={sortKey === 'name' ? 'sorted' : ''}>
                  Repository{si('name')}
                </th>
                <th>Health</th>
                <th onClick={() => handleSort('stargazers_count')} className={sortKey === 'stargazers_count' ? 'sorted' : ''}>
                  Stars{si('stargazers_count')}
                </th>
                <th onClick={() => handleSort('forks_count')} className={sortKey === 'forks_count' ? 'sorted' : ''}>
                  Forks{si('forks_count')}
                </th>
                <th onClick={() => handleSort('open_issues_count')} className={sortKey === 'open_issues_count' ? 'sorted' : ''}>
                  Issues{si('open_issues_count')}
                </th>
                <th>Language</th>
                <th onClick={() => handleSort('pushed_at')} className={sortKey === 'pushed_at' ? 'sorted' : ''}>
                  Last Push{si('pushed_at')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(ghMode ? ghResults : sorted).map((repo) => {
                const health = getRepoHealth(repo);
                const langColor = repo.language ? getLanguageColor(repo.language) : '#8b949e';
                return (
                    <tr
                      key={repo.id}
                      onClick={() => onRepoClick(repo)}
                      style={{ cursor: 'pointer' }}
                      className="repo-table__clickable"
                    >
                    <td>
                      <div>
                        <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
                          {repo.name}
                        </a>
                        {repo.archived && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--fg-muted)', border: '1px solid var(--border-default)', borderRadius: 4, padding: '1px 5px' }}>archived</span>
                        )}
                        {repo.description && (
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {repo.description}
                          </div>
                        )}
                        {repo.topics && repo.topics.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {repo.topics.slice(0, 4).map((t) => (
                              <span key={t} style={{ fontSize: 10, background: 'rgba(56,139,253,0.1)', color: 'var(--accent)', border: '1px solid rgba(56,139,253,0.3)', borderRadius: 10, padding: '0 6px' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><HealthBadge health={health} /></td>
                    <td style={{ textAlign: 'right' }}>⭐ {repo.stargazers_count.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>🍴 {repo.forks_count.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{repo.open_issues_count.toLocaleString()}</td>
                    <td>
                      {repo.language ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: langColor, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 12 }}>{repo.language}</span>
                        </span>
                      ) : <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(repo.pushed_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
