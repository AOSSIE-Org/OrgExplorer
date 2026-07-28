import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiExternalLink, FiCalendar, FiBriefcase, FiAlertTriangle } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle, Spinner, StatCard } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ContributorProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { orgs, pat, pullsData } = useApp()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawContributions, setRawContributions] = useState([])
  const [tab, setTab] = useState('prs')

  // Date Range Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Determine organizations to search
  const searchOrgs = useMemo(() => {
    let list = orgs.map(o => o.login)
    if (!list.length) {
      const recent = JSON.parse(localStorage.getItem('oe_recent') || '[]')
      if (recent.length) {
        list = recent[0].split(',').map(s => s.trim())
      }
    }
    return list
  }, [orgs])

  // Fetch contributor issues & PRs from GitHub Search API
  useEffect(() => {
    if (!username || !searchOrgs.length) {
      setLoading(false)
      return
    }

    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const orgQuery = searchOrgs.map(org => `org:${org}`).join('+')
        const url = `https://api.github.com/search/issues?q=author:${username}+${orgQuery}&per_page=100`

        const headers = { Accept: 'application/vnd.github.v3+json' }
        if (pat) {
          headers.Authorization = `token ${pat}`
        }

        const res = await fetch(url, { headers })

        if (res.status === 403) {
          throw new Error('RATE_LIMIT')
        }
        if (!res.ok) {
          throw new Error(`HTTP_${res.status}`)
        }

        const data = await res.json()
        setRawContributions(data.items || [])
      } catch (err) {
        if (err.message === 'RATE_LIMIT') {
          setError('GitHub API search rate limit reached. Please wait a minute or configure a PAT in Settings.')
        } else {
          setError(`Failed to fetch contributor details: ${err.message}`)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [username, searchOrgs, pat])

  // Presets
  const setPreset = (type) => {
    const today = new Date().toISOString().split('T')[0]
    if (type === 'gsoc') {
      // Standard GSoC Coding Period
      setStartDate('2026-05-18')
      setEndDate('2026-08-24')
    } else if (type === 'month') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]
      setStartDate(thirtyDaysAgo)
      setEndDate(today)
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  // Filter contributions by date range
  const filteredContribs = useMemo(() => {
    return rawContributions.filter(item => {
      const date = new Date(item.created_at)
      if (startDate && date < new Date(startDate)) return false
      if (endDate) {
        // Include the entire end date day
        const endLimit = new Date(endDate)
        endLimit.setHours(23, 59, 59, 999)
        if (date > endLimit) return false
      }
      return true
    })
  }, [rawContributions, startDate, endDate])

  // Categorize contributions
  const { prs, issues } = useMemo(() => {
    const prList = []
    const issueList = []

    filteredContribs.forEach(item => {
      // Parse repository name
      const repoName = item.repository_url ? item.repository_url.split('/').pop() : 'Unknown'
      const parsedItem = {
        ...item,
        repoName,
        isPR: Boolean(item.pull_request),
      }

      if (parsedItem.isPR) {
        // Cross-reference with pullsData to determine if merged
        let merged = false
        const localPulls = Object.values(pullsData || {}).flat()
        const localMatch = localPulls.find(p => p.number === item.number && p.base?.repo?.name === repoName)
        
        if (localMatch) {
          merged = Boolean(localMatch.merged_at)
        } else if (item.state === 'closed') {
          // Fallback heuristic if we don't have local pullsData
          merged = true // Most closed GSoC PRs are merged
        }

        prList.push({
          ...parsedItem,
          isMerged: merged,
        })
      } else {
        issueList.push(parsedItem)
      }
    })

    return { prs: prList, issues: issueList }
  }, [filteredContribs, pullsData])

  // Time-series charting data (Monthly)
  const chartData = useMemo(() => {
    const monthlyBuckets = {}
    
    filteredContribs.forEach(item => {
      const date = new Date(item.created_at)
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' }) // e.g. "May 26"
      
      if (!monthlyBuckets[monthKey]) {
        monthlyBuckets[monthKey] = { name: monthKey, PRs: 0, Issues: 0 }
      }
      
      if (item.pull_request) {
        monthlyBuckets[monthKey].PRs++
      } else {
        monthlyBuckets[monthKey].Issues++
      }
    })

    // Sort chronologically (rough sort by date parser key)
    return Object.values(monthlyBuckets).sort((a, b) => {
      const parseDate = str => {
        const [m, y] = str.split(' ')
        return new Date(Date.parse(`${m} 1, 20${y}`))
      }
      return parseDate(a.name) - parseDate(b.name)
    })
  }, [filteredContribs])

  // Export to Markdown Report
  const exportMarkdown = () => {
    const dateStr = new Date().toLocaleDateString()
    const orgsStr = searchOrgs.join(', ')
    const dateRangeStr = (startDate || 'Beginning') + ' to ' + (endDate || 'Present')

    let md = `# GSoC Contribution Report: ${username}\n\n`
    md += `* **Generated on:** ${dateStr}\n`
    md += `* **Organizations explored:** ${orgsStr}\n`
    md += `* **Reporting Period:** ${dateRangeStr}\n\n`

    md += `## 📊 Executive Summary\n\n`
    md += `| Contribution Metric | Count |\n`
    md += `| :--- | :---: |\n`
    md += `| **Total Pull Requests** | ${prs.length} |\n`
    md += `| **Total Issues Opened** | ${issues.length} |\n`
    md += `| **Merged Pull Requests** | ${prs.filter(p => p.isMerged).length} |\n\n`

    md += `## 🚀 Pull Requests (${prs.length})\n\n`
    if (prs.length) {
      md += `| Repository | PR # | Title | Date | Status | Link |\n`
      md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`
      prs.forEach(p => {
        const status = p.state === 'open' ? 'Open' : p.isMerged ? 'Merged' : 'Closed'
        const date = p.created_at.slice(0, 10)
        md += `| ${p.repoName} | #${p.number} | ${p.title} | ${date} | **${status}** | [PR Link](${p.html_url}) |\n`
      })
    } else {
      md += `No pull requests recorded in this period.\n`
    }
    md += `\n`

    md += `## 🐛 Issues Opened (${issues.length})\n\n`
    if (issues.length) {
      md += `| Repository | Issue # | Title | Date | Status | Link |\n`
      md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`
      issues.forEach(i => {
        const status = i.state === 'open' ? 'Open' : 'Closed'
        const date = i.created_at.slice(0, 10)
        md += `| ${i.repoName} | #${i.number} | ${i.title} | ${date} | **${status}** | [Issue Link](${i.html_url}) |\n`
      })
    } else {
      md += `No issues opened in this period.\n`
    }
    md += `\n`

    md += `---\n`
    md += `*Report generated automatically by **OrgExplorer**.*\n`

    // File download trigger
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `gsoc-report-${username}-${new Date().toISOString().slice(0, 10)}.md`
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Spinner size={36} />
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Analyzing developer workspace history...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      {/* Back navigation & page header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/contributors')}
          style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            cursor: 'pointer', padding: '6px 0', marginBottom: 12
          }}
          className="hover:text-(--text) transition"
        >
          <FiArrowLeft size={14} /> Back to Contributor Intelligence
        </button>
      </div>

      <PageTitle
        title={`Contributor Profile: @${username}`}
        subtitle={`Analyzing contributions across ${searchOrgs.join(', ')}`}
        right={
          <button
            onClick={exportMarkdown}
            disabled={!filteredContribs.length}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <FiDownload size={13} /> Export GSoC Report (.md)
          </button>
        }
      />

      {error && (
        <div style={{ ...C.card, display: 'flex', alignItems: 'center', gap: 12, borderColor: 'var(--red)', background: 'rgba(239,68,68,.05)', marginBottom: 20 }}>
          <FiAlertTriangle color="var(--red)" size={18} />
          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Date Filters Card */}
      <div style={{ ...C.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiCalendar size={15} color="var(--text2)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Reporting Window & Date Presets</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPreset('gsoc')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              GSoC Coding Period
            </button>
            <button onClick={() => setPreset('month')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              Last 30 Days
            </button>
            <button onClick={() => setPreset('all')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              All Time
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={C.input}
            />
          </div>
          <span style={{ color: 'var(--text2)', marginTop: 18 }}>to</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={C.input}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Contributions" value={filteredContribs.length} sub="Filtered timeframe" />
        <StatCard label="Pull Requests" value={prs.length} sub={`${prs.filter(p => p.isMerged).length} Merged`} accent="var(--blue)" />
        <StatCard label="Issues Opened" value={issues.length} sub={`${issues.filter(i => i.state === 'closed').length} Closed`} accent="var(--amber)" />
        <StatCard 
          label="Active Repositories" 
          value={new Set(filteredContribs.map(i => i.repository_url?.split('/').pop())).size} 
          sub="Queried Organizations"
          accent="var(--green)"
        />
      </div>

      {/* Visual Activity Timeline Chart */}
      {chartData.length > 0 ? (
        <div style={{ ...C.card, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Contribution Velocity Over Time</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text2)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text2)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text)' }}
                  itemStyle={{ color: 'var(--text2)' }}
                />
                <Bar dataKey="PRs" fill="var(--blue)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Issues" fill="var(--amber)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue)' }} /> Pull Requests
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} /> Issues
            </span>
          </div>
        </div>
      ) : null}

      {/* Tabs for details list */}
      <div style={C.card}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button
            onClick={() => setTab('prs')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === 'prs' ? 'var(--text)' : 'var(--text2)',
              fontWeight: tab === 'prs' ? 600 : 400,
              fontSize: 13, padding: '6px 12px',
              borderBottom: tab === 'prs' ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            Pull Requests ({prs.length})
          </button>
          <button
            onClick={() => setTab('issues')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === 'issues' ? 'var(--text)' : 'var(--text2)',
              fontWeight: tab === 'issues' ? 600 : 400,
              fontSize: 13, padding: '6px 12px',
              borderBottom: tab === 'issues' ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            Issues ({issues.length})
          </button>
        </div>

        {tab === 'prs' ? (
          prs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>TITLE / NUMBER</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>REPOSITORY</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>SUBMITTED ON</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>STATUS</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>LINK</th>
                  </tr>
                </thead>
                <tbody>
                  {prs.map((p, i) => {
                    const status = p.state === 'open' ? 'Open' : p.isMerged ? 'Merged' : 'Closed'
                    const statusColor = status === 'Merged' ? 'var(--green)' : status === 'Open' ? 'var(--blue)' : 'var(--text2)'
                    const statusBg = status === 'Merged' ? 'rgba(34,197,94,.12)' : status === 'Open' ? 'rgba(59,130,246,.12)' : 'var(--surface2)'
                    
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>
                          <div>{p.title}</div>
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>#{p.number}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>
                          <span style={C.pill('var(--accent)', 'rgba(245,197,24,.1)')}>{p.repoName}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)' }}>{p.created_at.slice(0, 10)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={C.pill(statusColor, statusBg)}>{status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <a href={p.html_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FiExternalLink size={12} /> GitHub
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text2)' }}>
              <FiBriefcase size={28} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>No pull requests found for this reporting period.</div>
            </div>
          )
        ) : (
          issues.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>TITLE / NUMBER</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>REPOSITORY</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>CREATED ON</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>STATUS</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>LINK</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue, i) => {
                    const status = issue.state === 'open' ? 'Open' : 'Closed'
                    const statusColor = status === 'Open' ? 'var(--blue)' : 'var(--text2)'
                    const statusBg = status === 'Open' ? 'rgba(59,130,246,.12)' : 'var(--surface2)'
                    
                    return (
                      <tr key={issue.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>
                          <div>{issue.title}</div>
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>#{issue.number}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>
                          <span style={C.pill('var(--accent)', 'rgba(245,197,24,.1)')}>{issue.repoName}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)' }}>{issue.created_at.slice(0, 10)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={C.pill(statusColor, statusBg)}>{status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <a href={issue.html_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FiExternalLink size={12} /> GitHub
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text2)' }}>
              <FiBriefcase size={28} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>No issues found for this reporting period.</div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
