import ActivityChart from '../Dashboard/ActivityChart';
import LanguageChart from '../Dashboard/LanguageChart';
import { aggregateLanguages, getLanguageColor, getRepoHealth } from '../../lib/github';
import type { RepoData, RepoHealth } from '../../types';

interface Props {
  repos: RepoData[];
  onRepoClick: (repo: RepoData) => void;
}

const HEALTH_STYLE: Record<RepoHealth, { text: string; label: string }> = {
  active: { text: '#3fb950', label: 'Active' },
  stale:  { text: '#d2961e', label: 'Stale'  },
  dead:   { text: '#f85149', label: 'Dead'   },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function OverviewTab({ repos, onRepoClick }: Props) {
  const languages = aggregateLanguages(repos);
  const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Activity Trends */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
              Activity Trends <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>(Last 7 Months)</span>
            </h3>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <ActivityChart repos={repos} />
          </div>
        </div>

        {/* Language Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
              Language Distribution
            </h3>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            {languages.length > 0 ? (
              <LanguageChart languages={languages} />
            ) : (
              <div style={{ color: 'var(--fg-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No language data</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Repositories by Stars */}
      {topRepos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
              Top Repositories by Stars
            </h3>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Click any row to view details</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="repo-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Stars</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Forks</th>
                  <th style={{ width: 110 }}>Language</th>
                  <th style={{ width: 80 }}>Health</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Last Push</th>
                </tr>
              </thead>
              <tbody>
                {topRepos.map((repo) => {
                  const health = getRepoHealth(repo);
                  const hs = HEALTH_STYLE[health];
                  const lc = repo.language ? getLanguageColor(repo.language) : '#8b949e';
                  return (
                    <tr
                      key={repo.id}
                      onClick={() => onRepoClick(repo)}
                      style={{ cursor: 'pointer' }}
                      className="repo-table__clickable"
                    >
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{repo.name}</span>
                        {repo.description && (
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {repo.description}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>⭐ {repo.stargazers_count.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>🍴 {repo.forks_count.toLocaleString()}</td>
                      <td>
                        {repo.language ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: lc, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 12 }}>{repo.language}</span>
                          </span>
                        ) : <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <span style={{ color: hs.text, fontSize: 11, fontWeight: 600 }}>{hs.label}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {formatDate(repo.pushed_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
