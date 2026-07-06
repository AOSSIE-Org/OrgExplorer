import React, { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle, InfoBox } from '../components/UI'
import { buildTimeSeries, exportTrendsCSV } from '../services/analytics'
import AnalysisBanner from '../components/AnalysisBanner'

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text)' },
  itemStyle:  { color: 'var(--text2)' },
}

export default function AnalyticsPage() {
  const { model, issuesData, runAudit, govLoading, auditComplete, loading, runGovernanceAnalysis } = useApp()
  const [granularity,   setGranularity]   = useState('monthly')
  const [selectedRepo,  setSelectedRepo]  = useState('All')

  const allIssues = useMemo(() => {
    const arr = []
    Object.values(issuesData || {}).forEach(issues => arr.push(...issues))
    return arr
  }, [issuesData])

  const filteredIssues = useMemo(() => {
    if (selectedRepo === 'All') return allIssues
    const key = Object.keys(issuesData || {}).find(k => k.split('/')[1] === selectedRepo)
    return key ? (issuesData[key] || []) : []
  }, [allIssues, selectedRepo, issuesData])

  const series = useMemo(() =>
    buildTimeSeries(filteredIssues, granularity),
    [filteredIssues, granularity]
  )

  if (!model) return null

  const repoNames = ['All', ...model.allRepos.slice(0, 12).map(r => r.name)]
  const hasData   = Object.keys(issuesData || {}).length > 0
  const hasSeries = series.length > 0

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner
        page="governance"
        description="Activity trends are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={auditComplete ? 'complete' : 'sample'}
        loading={loading || govLoading}
        onRun={runGovernanceAnalysis}
      />
      <PageTitle
        title="Activity Trends"
        subtitle="How PR and issue velocity is evolving over time — created, merged, and closed per week or month"
        right={
          hasSeries && (
            <button
              onClick={() => exportTrendsCSV(series)}
              style={{ ...C.btn('ghost'), fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiDownload size={13} /> Export CSV
            </button>
          )
        }
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedRepo}
          onChange={e => setSelectedRepo(e.target.value)}
          style={C.select}
        >
          {repoNames.map(r => <option key={r}>{r}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {['monthly', 'weekly'].map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              style={{ ...C.btn(granularity === g ? 'primary' : 'ghost'), fontSize: 12, padding: '7px 16px' }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        {!hasData && (
          <button
            onClick={runAudit}
            disabled={govLoading}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: govLoading ? 0.7 : 1 }}
          >
            <FiRefreshCw size={13} />
            {govLoading ? 'Fetching issue history...' : 'Load Issue and PR History'}
          </button>
        )}
      </div>

      {/* Empty state before audit runs */}
      {!hasData && !govLoading && (
        <InfoBox>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            No trend data loaded yet
          </div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Click "Load Issue and PR History" above to fetch issue and PR timestamps for the top repositories.
          </p>
          <p style={{ fontSize: 12 }}>
            This reuses the governance audit fetch — issues are bucketed by created, closed, and merged timestamps
            into weekly or monthly bins with no additional API calls beyond the audit itself.
          </p>
        </InfoBox>
      )}

      {govLoading && (
        <InfoBox>
          <div style={{ fontSize: 14, color: 'var(--text)' }}>
            Fetching issue and PR history for top 15 repositories in batches of 5...
          </div>
        </InfoBox>
      )}

      {/* PR chart */}
      {hasSeries && (
        <>
          <div style={{ ...C.card, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Pull Request Activity</div>
            <div style={{ ...C.label, marginBottom: 20 }}>Created vs Merged vs Closed</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="prs_created" name="Created" stroke="#f5c518" fill="rgba(245,197,24,.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="prs_merged"  name="Merged"  stroke="#22c55e" fill="rgba(34,197,94,.1)"  strokeWidth={2} />
                <Area type="monotone" dataKey="prs_closed"  name="Closed"  stroke="#ef4444" fill="rgba(239,68,68,.1)"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Issue chart */}
          <div style={C.card}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Issue Activity</div>
            <div style={{ ...C.label, marginBottom: 20 }}>Created vs Closed</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="issues_created" name="Created" stroke="#f5c518" fill="rgba(245,197,24,.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="issues_closed"  name="Closed"  stroke="#22c55e" fill="rgba(34,197,94,.1)"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {hasData && !hasSeries && (
        <InfoBox>
          <div style={{ color: 'var(--green)', fontWeight: 600 }}>
            No time-series data found for this selection.
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Try selecting "All" repositories.</div>
        </InfoBox>
      )}
    </div>
  )
}
