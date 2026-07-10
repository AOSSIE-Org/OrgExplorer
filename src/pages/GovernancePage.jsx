import React, { useState, useMemo } from 'react'
import { FiRefreshCw, FiExternalLink } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle, EmptyOk } from '../components/UI'
import AnalysisBanner from '../components/AnalysisBanner'

const TABS = [
  { key: 'dead',    label: 'Dead Issues' },
  { key: 'zombie',  label: 'Zombie PRs'  },
  { key: 'stale',   label: 'Stale Issues Ratio' },
  { key: 'license', label: 'No License'  },
]

const getStatus = ratio => {
  if (ratio <= 10)
    return {
      label: 'Excellent',
      color: 'var(--green)',
      bg: 'rgba(34,197,94,.12)'
    }

  if (ratio <= 25)
    return {
      label: 'Healthy',
      color: 'var(--amber)',
      bg: 'rgba(250,204,21,.12)'
    }

  if (ratio <= 40)
    return {
      label: 'Warning',
      color: 'var(--orange)',
      bg: 'rgba(251,146,60,.12)'
    }

  return {
    label: 'Critical',
    color: 'var(--red)',
    bg: 'rgba(239,68,68,.12)'
  }
}

export default function GovernancePage() {
  const { model, issuesData, runAudit, govLoading, auditComplete, loading, runGovernanceAnalysis,staleRepoStats } = useApp()
  const [tab, setTab] = useState('dead')

  const ITEMS_PER_PAGE = 10
  const [stalePage, setStalePage] = useState(1)
  const totalPages = Math.ceil(staleRepoStats.length / ITEMS_PER_PAGE)

  const paginatedStaleRepos = useMemo(() => {
    const start = (stalePage - 1) * ITEMS_PER_PAGE
    return staleRepoStats.slice(start, start + ITEMS_PER_PAGE)
  }, [staleRepoStats, stalePage])
  // Flatten all issues and tag with repo/org
  const allIssues = useMemo(() => {
    const arr = []
    Object.entries(issuesData || {}).forEach(([key, issues]) => {
      const [org, repo] = key.split('/')
      issues.forEach(i => arr.push({ ...i, repoName: repo, orgName: org }))
    })
    return arr
  }, [issuesData])

  if (!model) return null

  const hasAudit = Object.keys(issuesData || {}).length > 0
  const daysSince = d => Math.floor((Date.now() - new Date(d)) / 86_400_000)

  // Health check 1 — Dead Issues (>90 days open, not a PR)
  const deadIssues = allIssues
    .filter(i => !i.pull_request && daysSince(i.created_at) >= 90)
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))

  // Health check 2 — Percentage of dead issues relative to all issues
  const staleIssuesRatio = allIssues.length ? (deadIssues.length / allIssues.length) * 100 : 0;

  // Health check 3 — Zombie PRs (>90 days open)
  const zombiePRs = allIssues
    .filter(i => i.pull_request && daysSince(i.created_at) >= 90)
    .sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at))

  // Health check 4 — No license
  const noLicense = model.allRepos.filter(r => !r.license && !r.archived && !r.fork)

  // Issue resolution rate per repo
  const topRepos = model.allRepos.slice(0, 8)

  const counts = { dead: deadIssues.length, zombie: zombiePRs.length, license: noLicense.length, stale: staleIssuesRatio.toFixed(2) }

  // Stat card
  const StatBox = ({ label, value, sub, color }) => (
    <div style={C.card}>
      <div style={C.label}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, margin: '6px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em' }}>{sub}</div>
    </div>
  )

  // Issue / PR row
  const IssueRow = ({ item, i }) => (
    <tr style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>#{item.number} · @{item.user?.login}</div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={C.pill('var(--accent)', 'rgba(245,197,24,.1)')}>{item.repoName}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={C.pill('var(--red)', 'rgba(239,68,68,.1)')}>{daysSince(item.created_at)} DAYS</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        {item.html_url && (
          <a href={item.html_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiExternalLink size={12} /> GitHub
          </a>
        )}
      </td>
    </tr>
  )

  const TableHead = () => (
    <thead>
      <tr>
        {['TITLE / ID', 'REPOSITORY', 'AGE', 'ACTION'].map(h => (
          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner
        page="governance"
        description="Governance insights are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={auditComplete ? 'complete' : 'standard'}
        loading={loading || govLoading}
        onRun={runGovernanceAnalysis}
      />
      <PageTitle
        title="Governance Audit"
        subtitle="Analyzing structural integrity and compliance across the portfolio"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {govLoading && <span style={{ fontSize: 13, color: 'var(--text2)' }}>Running audit...</span>}
            <button
              onClick={runAudit}
              disabled={govLoading}
              style={{ ...C.btn(hasAudit ? 'ghost' : 'primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: govLoading ? 0.7 : 1 }}
            >
              <FiRefreshCw size={13} /> {hasAudit ? 'Re-run Audit' : 'Run Audit'}
            </button>
          </div>
        }
      />

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatBox label="Dead Issues"  value={counts.dead}    sub="OPEN 90+ DAYS"          color="var(--red)"    />
        <StatBox label="Stale Issues Ratio" value={`${staleIssuesRatio.toFixed(2)}%`} sub={`of ${allIssues.length} total issues`} color={` ${getStatus(staleIssuesRatio).color}`} />
        <StatBox label="Zombie PRs"   value={counts.zombie}  sub="PENDING 90+ DAYS"       color="var(--amber)"  />
        <StatBox label="No License"   value={counts.license} sub="COMPLIANCE MISSING"     color="var(--text2)"  />
      </div>

      {/* Issue Resolution Rate */}
      <div style={{ ...C.card, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Issue Resolution Rate</div>
        <div style={{ ...C.label, marginBottom: 16 }}>Resolution velocity across key repositories</div>
        {topRepos.map(r => {
          const repoIssues = allIssues.filter(i => i.repoName === r.name)
          const closed     = repoIssues.filter(i => i.state === 'closed').length
          const total      = repoIssues.length
          const rate       = total ? Math.round(closed / total * 100) : null
          const color      = rate === null ? 'var(--text3)' : rate >= 70 ? 'var(--green)' : rate >= 30 ? 'var(--amber)' : 'var(--red)'

          return (
            <div key={r.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{r.orgLogin}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color }}>
                  {rate === null ? 'No data' : `${rate}%`}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                {rate !== null && (
                  <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
                )}
              </div>
            </div>
          )
        })}
        {!hasAudit && (
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Run the audit to populate resolution rates with live issue data.
          </div>
        )}
      </div>

      {/* Tabbed detail view */}
      <div style={C.card}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: tab === t.key ? 'var(--text)' : 'var(--text2)',
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 13, padding: '6px 12px',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}{' '}
              <span style={{ color: counts[t.key] > 40 ? 'var(--red)' : 'var(--green)', marginLeft: 4 }}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Dead Issues */}
        {tab === 'dead' && (
          deadIssues.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead />
                <tbody>{deadIssues.slice(0, 25).map((item, i) => <IssueRow key={item.id} item={item} i={i} />)}</tbody>
              </table>
            </div>
          ) : <EmptyOk msg="No dead issues found" sub="This org actively maintains its open items." />
        )}

        {/* Zombie PRs */}
        {tab === 'zombie' && (
          zombiePRs.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead />
                <tbody>{zombiePRs.slice(0, 25).map((item, i) => <IssueRow key={item.id} item={item} i={i} />)}</tbody>
              </table>
            </div>
          ) : <EmptyOk msg="No zombie PRs found" sub="This org reviews and closes contributions actively." />
        )}

        {/* Stale Issues */}
        {tab === 'stale' && (
          staleRepoStats.length ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paginatedStaleRepos.map(repo => {
                  const status = getStatus(repo.ratio)

                  return (
                    <div
                      key={repo.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: 'var(--surface2)',
                        borderRadius: 6
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {repo.repo}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: 'var(--text2)'
                          }}
                        >
                          {repo.staleCount} stale issues out of{' '}
                          {repo.openCount} open issues ({repo.ratio}%)
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 30
                        }}
                      >
                        <span style={C.pill(status.color, status.bg)}>
                          {status.label}
                        </span>
                        <a href={`https://github.com/${repo.org}/${repo.repo}/issues`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiExternalLink size={12} /> GitHub
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 16
                  }}
                >
                  <button
                    onClick={() => setStalePage(p => p - 1)}
                    disabled={stalePage === 1}
                    style={{
                      padding: '8px 14px',
                      cursor: stalePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: stalePage === 1 ? 0.5 : 1
                    }}
                  >
                    ← Previous
                  </button>

                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    Page {stalePage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setStalePage(p => p + 1)}
                    disabled={stalePage === totalPages}
                    style={{
                      padding: '8px 14px',
                      cursor: stalePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: stalePage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyOk
              msg="No stale issues found"
              sub="All repositories have active open issues."
            />
          )
        )}

        {/* No License */}
        {tab === 'license' && (
          noLicense.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noLicense.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.orgLogin}</div>
                  </div>
                  <span style={C.pill('var(--red)', 'rgba(239,68,68,.12)')}>NO LICENSE</span>
                </div>
              ))}
            </div>
          ) : <EmptyOk msg="All repos have licenses" sub="Good compliance across the portfolio." />
        )}
      </div>
    </div>
  )
}
