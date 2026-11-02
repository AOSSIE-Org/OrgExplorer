import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { C } from './UI'
import { buildRepositoryCreationTimeline } from '../utils/repositoryCreationTimeline'
import { formatNumber } from '../utils/formatNumber'

export function CreationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { period, created, cumulative } = payload[0].payload
  return (
    <div style={{ ...C.card, padding: 12, fontSize: 12 }}>
      <strong>{period}</strong>
      <p>Repositories created: {formatNumber(created)}</p>
      <p>Cumulative loaded repositories: {formatNumber(cumulative)}</p>
    </div>
  )
}

export default function RepositoryCreationTimeline({ repos }) {
  const [granularity, setGranularity] = useState('yearly')
  const timeline = useMemo(
    () => buildRepositoryCreationTimeline(repos, granularity),
    [repos, granularity]
  )
  const datedRepos = timeline.at(-1)?.cumulative || 0
  const excludedRepos = repos.length - datedRepos

  return (
    <section
      aria-label="Repository creation timeline"
      style={{ ...C.card, marginBottom: 20, minWidth: 0 }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Repository Creation Timeline</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          Group by
          <select
            value={granularity}
            onChange={e => setGranularity(e.target.value)}
            style={{ ...C.select, outline: 'revert' }}
          >
            <option value="yearly">Year</option>
            <option value="monthly">Month</option>
          </select>
        </label>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
        Based on {formatNumber(repos.length)} loaded {repos.length === 1 ? 'repository' : 'repositories'}
        {' '}in the selected organization scope.
        {' '}This is not a complete historical total and does not include deleted repositories.
        {excludedRepos > 0 && (
          <>
            {' '}{formatNumber(excludedRepos)} {excludedRepos === 1
              ? 'repository without a valid creation date is'
              : 'repositories without valid creation dates are'} excluded.
          </>
        )}
      </p>
      {timeline.length ? (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeline} accessibilityLayer margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: 'var(--text2)', fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text2)', fontSize: 11 }} width={44} />
              <Tooltip content={<CreationTooltip />} cursor={{ fill: 'var(--surface2)' }} />
              <Bar
                dataKey="created"
                name="Repositories created"
                fill="var(--accent)"
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          <details style={{ marginTop: 12, fontSize: 12 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--text2)' }}>View timeline data</summary>
            <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 12 }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <caption style={{ textAlign: 'left', marginBottom: 8 }}>Repository creation counts (UTC)</caption>
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Created</th>
                    <th scope="col">Cumulative loaded repositories</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map(row => (
                    <tr key={row.period} style={{ borderTop: '1px solid var(--border)' }}>
                      <th scope="row" style={{ padding: '6px 0', fontWeight: 400 }}>{row.period}</th>
                      <td>{formatNumber(row.created)}</td>
                      <td>{formatNumber(row.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p
          role="status"
          style={{ color: 'var(--text2)', padding: '32px 0', textAlign: 'center', fontSize: 13 }}
        >
          No repository creation dates available for this selection.
        </p>
      )}
    </section>
  )
}
