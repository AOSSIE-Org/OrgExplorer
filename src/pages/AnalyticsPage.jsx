import React, { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,  RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle, InfoBox } from '../components/UI'
import { buildTimeSeries, exportTrendsCSV } from '../services/analytics'
import { FaCodeBranch } from 'react-icons/fa'
import { IoChevronDown } from 'react-icons/io5'
import { HiCheck, HiOutlineClock } from 'react-icons/hi'
import { useAdvancedMetrics } from '../hooks/useSortedData'
import AnalysisBanner from '../components/AnalysisBanner'
import { AnalyticsSkeleton } from '../components/Orgexplorerskeletons'

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
  const { model, issuesData, runAudit, govLoading, runAdvanceAnalytics, advanceAnalyticsLoading, advanceAnalyticsComplete, runFullAnalytics, pullsData,  auditComplete, loading, runGovernanceAnalysis, pat  } = useApp()

  const [granularity,   setGranularity]   = useState('monthly')
  const [selectedRepo, setSelectedRepo] = useState('All')
  const [selectedRepoForAM, setSelectedRepoForAM] = useState("All Repositories");

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

  const filteredPulls = useMemo(() => {
    if (selectedRepoForAM === 'All Repositories') return Object.values(pullsData || {}).flat()
    const key = Object.keys(pullsData || {}).find(k => k.split('/')[1] === selectedRepoForAM)
    return key ? (pullsData[key] || []) : []
  }, [pullsData, selectedRepoForAM])

  const advancedMetrics = useAdvancedMetrics(filteredPulls)

  if(loading) return <AnalyticsSkeleton />
  if (!model) return null

  const acceptanceChart = [
    {
      name: 'Merged',
      value: advancedMetrics.merged
    },
    {
      name: 'Rejected',
      value: advancedMetrics.rejected
    }
  ]
  
  const repoNames = ['All', ...Object.keys(issuesData || {}).map(k => k.split('/')[1])]
  const allRepoNames = ['All Repositories', ...Object.keys(pullsData || {}).map(k => k.split('/')[1])]
  const hasData = Object.keys(issuesData || {}).length > 0
  const hasPullsData = Object.keys(pullsData || {}).length > 0
  const hasSeries = series.length > 0

  const MAX_DAYS = 14

  const mergeGauge = [
    {
      value: Math.min(
        (advancedMetrics.avgMergeDays / MAX_DAYS) * 100,
        100
      )
    }
  ]

  const getMergeColor = days => {
    if (days <= 5) return 'var(--green)'
    if (days <= 10) return 'var(--accent)'
    if (days <= 15) return 'var(--amber)'
    return 'var(--red)'
  }
  const analyticsComplete = auditComplete && advanceAnalyticsComplete
  
  return (
    <>
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner
        page="governance"
        description="Activity trends and advanced metrics are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={analyticsComplete ? 'complete' : 'sample'}
        loading={loading || govLoading || advanceAnalyticsLoading}
        onRun={runFullAnalytics}
      />
      <PageTitle
        title="Activity Trends"
        subtitle="How PR and issue velocity is evolving over time — created, merged, and closed per week or month."
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
            onClick={() => pat ? runFullAnalytics() : runGovernanceAnalysis()}
            disabled={govLoading || advanceAnalyticsLoading}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: govLoading ? 0.7 : 1 }}
          >
            <FiRefreshCw size={13} />
              {(govLoading || advanceAnalyticsLoading)
              ? (pat ? 'Fetching full data...' : 'Fetching issue history...')
              : 'Load Issue and PR History'}
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
            {pat
            ? 'Fetching issue and PR history for all repositories in batches of 5...'
            : 'Fetching issue and PR history for top 10 repositories in batches of 5...'}
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
                <Area type="monotone" dataKey="prs_created" name="Created" stroke="var(--accent)" fill="rgba(245,197,24,.3)" strokeWidth={2} />
                <Area type="monotone" dataKey="prs_merged"  name="Merged"  stroke="var(--green)" fill="rgba(34,197,94,.1)"  strokeWidth={2} />
                <Area type="monotone" dataKey="prs_closed"  name="Closed"  stroke="var(--red)" fill="rgba(239,68,68,.1)"  strokeWidth={2} />
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
                <Area type="monotone" dataKey="issues_created" name="Created" stroke="var(--accent)" fill="rgba(245,197,24,.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="issues_closed"  name="Closed"  stroke="var(--green)" fill="rgba(34,197,94,.1)"  strokeWidth={2} />
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
      
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <PageTitle
        title="Advanced Analytics"
        subtitle="Key metrics and trends for your organization, including PR acceptance rate and PR average merge time, and more."
      />
        
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Repository Selection */}
        <div
          style={{
            position: 'relative',
            width: 260
          }}
        >
          <FaCodeBranch
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text2)',
              pointerEvents: 'none'
            }}
          />

          <select
            value={selectedRepoForAM}
            onChange={e => setSelectedRepoForAM(e.target.value)}
            style={{
              ...C.select,
              width: '100%',
              paddingLeft: 36,
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            {allRepoNames.map(repo => (
              <option key={repo}>{repo}</option>
            ))}
          </select>
          <IoChevronDown
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text)',
              pointerEvents: 'none'
            }}
          />
        </div>
          
        {!hasPullsData && (
          <button
            onClick={() => pat ? runFullAnalytics() : runAdvanceAnalytics()}
            disabled={govLoading || advanceAnalyticsLoading}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: advanceAnalyticsLoading ? 0.7 : 1 }}
          >
            <FiRefreshCw size={13} />
              {(govLoading || advanceAnalyticsLoading)
              ? (pat ? 'Fetching full data...' : 'Collecting...')
              : 'Collect Advanced Metrics'}
          </button>
        )}
      </div>

      {/* Empty state before audit runs */}
      {!hasPullsData && !advanceAnalyticsLoading && (
        <InfoBox>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            No Pull Request data loaded yet
          </div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Click "Collect Advanced Metrics" above to fetch pull request data for the top repositories.
          </p>
          <p style={{ fontSize: 12 }}>
            This computes average merge time and PR acceptance rate from each repository's pull
            request history, with no additional API calls beyond the fetch itself.
          </p>
        </InfoBox>
      )}

      {advanceAnalyticsLoading && (
        <InfoBox>
          <div style={{ fontSize: 14, color: 'var(--text)' }}>
            {pat
            ? 'Fetching pull request history for all repositories in batches of 5...'
            : 'Fetching pull request history for top 10 repositories in batches of 5...'}
          </div>
        </InfoBox>
      )}

      {hasPullsData &&
        (<div
          style={{
            gap: 20,
            marginTop: 24
          }}
          className='grid grid-cols-1 md:grid-cols-2'
        >
          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              minHeight: 340
            }}
          >
          <div className='flex gap-4 items-center mb-4'>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "rgba(34,197,94,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <HiOutlineClock
                size={34}
                color="#22c55e"
              />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600
                }}
              >
                Average PR Merge Time
              </div>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: getMergeColor(advancedMetrics.avgMergeDays),
                  lineHeight: 1,
                }}
                className={`${getMergeColor(advancedMetrics.avgMergeDays)}`}>
                {advancedMetrics.avgMergeDays.toFixed(1)}
              </span>
              <span style={{ color: 'var(--text2)', fontSize: 14 }}>
              &nbsp;Days
              </span>
            </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadialBarChart
                data={mergeGauge}
                innerRadius="72%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                barSize={16}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  tick={false}
                />

                <RadialBar
                  background={{
                    fill: 'var(--surface3)'
                  }}
                  clockWise
                  dataKey="value"
                  cornerRadius={12}
                  fill={getMergeColor(advancedMetrics.avgMergeDays)}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            <div
              style={{
                position: 'absolute',
                top: '58%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700
                }}
              >
                {advancedMetrics.avgMergeDays.toFixed(1)}
              </div>

              <div
                style={{
                  color: 'var(--text2)',
                  fontSize: 14
                }}
              >
                Days
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: getMergeColor(advancedMetrics.avgMergeDays),
                  fontWeight: 600
                }}
              >
                {advancedMetrics.avgMergeDays <= 2
                  ? 'Excellent'
                  : advancedMetrics.avgMergeDays <= 5
                  ? 'Good'
                  : advancedMetrics.avgMergeDays <= 10
                  ? 'Slow'
                  : 'Very Slow'}
              </div>
            </div>
            
            <div
              style={{
                  marginTop: -20,
                  textAlign: 'center',
                  color: 'var(--text)',
                  fontSize: 13
                }}
              >
                Based on <b>{advancedMetrics.merged}</b> merged pull requests
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20
            }}
          >
            <div className='flex gap-4 items-center mb-4'>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(168,85,247,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <HiCheck
                  size={34}
                  color="#a855f7"
                />
              </div>
              <div>
                <div className="section-title font-bold">
                  Pull Request Acceptance Rate
                </div>

                <div>
                  <span 
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    color: 'var(--purple)',
                    lineHeight: 1,
                    }}>
                    {advancedMetrics.acceptanceRate.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      color: 'var(--text2)',
                      fontWeight: 700,
                    }}
                  >
                  &nbsp;%
                  </span>
                </div>
                </div>
              </div>

                <div
                  style={{
                    marginTop: 10,
                    color: 'var(--text2)',
                    fontSize: 13
                  }}
                >
                  <b>{advancedMetrics.merged}</b> merged ·{' '}
                  <b>{advancedMetrics.rejected}</b> rejected
                </div>
            <ResponsiveContainer
              width="100%"
              height="70%"
            >
              <PieChart
                margin={{ top: 10, right: 0, left: 0, bottom: 10 }}
              >
                <Pie
                  data={acceptanceChart}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  blendStroke="var(--surface)"
                >
                  <Cell fill="var(--green)" />
                  <Cell fill="var(--red)" />
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
    </div>
  </>
  )
}
