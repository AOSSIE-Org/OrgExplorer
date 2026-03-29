import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Contributor, RepoData } from '../../types';
import { useContributors } from '../../hooks/useContributors';

interface Props {
  orgName: string;
  repos: RepoData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--fg-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ color: 'var(--accent)' }}>Contributions: <strong>{payload[0]?.value}</strong></div>
    </div>
  );
}

function ContributorCard({ c, rank }: { c: Contributor; rank: number }) {
  return (
    <a
      href={c.html_url}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-default)',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: rank <= 3 ? '#f0c040' : 'var(--fg-muted)',
          width: 22,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          #{rank}
        </span>
        <img
          src={c.avatar_url}
          alt={c.login}
          width={36}
          height={36}
          style={{ borderRadius: '50%', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-default)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.login}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
            {c.repos.length} repo{c.repos.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
            {c.contributions.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>commits</div>
        </div>
      </div>
    </a>
  );
}

export default function ContributorsTab({ orgName, repos }: Props) {
  const { contributors, loading, error, fromCache } = useContributors(orgName, repos);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-muted)', gap: 10 }}>
        <div className="spinner" />
        Loading contributors…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, background: 'rgba(248,81,73,0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149' }}>
        Failed to load contributors: {error}
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>No contributor data available</div>
    );
  }

  const chartData = contributors.slice(0, 15).map((c) => ({ name: c.login, contributions: c.contributions }));

  return (
    <div>
      {/* Cache badge */}
      {fromCache && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span style={{
            background: 'rgba(56,139,253,0.1)',
            color: 'var(--accent)',
            border: '1px solid rgba(56,139,253,0.3)',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}>
            Data cached locally
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Leaderboard */}
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top Contributors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contributors.slice(0, 10).map((c, i) => (
              <ContributorCard key={c.login} c={c} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
              Contribution Distribution <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 400 }}>(Top 15)</span>
            </h3>
          </div>
          <div style={{ padding: '0 16px 20px' }}>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="contributions" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
