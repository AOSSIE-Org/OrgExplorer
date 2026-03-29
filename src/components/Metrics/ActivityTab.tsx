import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RepoData } from '../../types';
import { useActivity } from '../../hooks/useActivity';

interface Props {
  orgName: string;
  repos: RepoData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ActivityTab({ orgName, repos }: Props) {
  const { activity, loading, error, fromCache, cachedAt, refresh } = useActivity(orgName, repos);

  const chartData = activity?.months.map((m) => ({
    month: m.month,
    Commits: m.commits,
    PRs: m.prs,
    Issues: m.issues,
  })) ?? [];

  return (
    <div>
      {/* Toolbar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {fromCache && (
          <span style={{
            background: 'rgba(56,139,253,0.1)',
            color: 'var(--accent)',
            border: '1px solid rgba(56,139,253,0.3)',
            borderRadius: 12,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Data cached locally
          </span>
        )}
        {cachedAt && (
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            Last fetched: {new Date(cachedAt).toLocaleString()}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Refreshing…</> : '⟳ Refresh Data'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(248,81,73,0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Activity Breakdown chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
            Activity Breakdown <span style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 400 }}>(Last 7 Months)</span>
          </h3>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          {loading && !activity ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--fg-muted)' }}>
              <div className="spinner" /> Loading activity data…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--fg-muted)' }} />
                <Line type="monotone" dataKey="Commits" stroke="#3fb950" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="PRs"     stroke="#388bfd" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Issues"  stroke="#f0883e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      {activity && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Commits (proxy)', value: activity.totalCommits, color: '#3fb950' },
            { label: 'Total PRs (7 mo.)',     value: activity.totalPRs,     color: '#388bfd' },
            { label: 'Total Issues (7 mo.)',  value: activity.totalIssues,   color: '#f0883e' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '20px 24px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
