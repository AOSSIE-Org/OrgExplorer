import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiExternalLink, FiCalendar, FiBriefcase, FiAlertTriangle } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle, Spinner, StatCard } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Reusable ContributionTable component
function ContributionTable({ items, dateHeader, resolveStatus }) {
  if (!items.length) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text2)' }}>
        <FiBriefcase size={28} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div>No items found for this reporting period.</div>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>TITLE / NUMBER</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>REPOSITORY</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>{dateHeader}</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>STATUS</th>
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>LINK</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const { status, color, bg } = resolveStatus(item)
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>
                  <div>{item.title}</div>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>#{item.number}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>
                  <span style={C.pill('var(--accent)', 'rgba(245,197,24,.1)')}>{item.repoName}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)' }}>{item.created_at.slice(0, 10)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={C.pill(color, bg)}>{status.toUpperCase()}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <a href={item.html_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FiExternalLink size={12} /> GitHub
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Pagination helper to fetch up to 10 pages (1,000 results maximum)
async function fetchAllPages(initialUrl, headers, signal) {
  let items = []
  let url = initialUrl
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(url, { headers, signal })
    if (res.status === 403) {
      throw new Error('RATE_LIMIT')
    }
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`)
    }
    const data = await res.json()
    items = items.concat(data.items || [])

    const linkHeader = res.headers.get('Link')
    if (!linkHeader) break

    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    if (!match) break

    url = match[1]
  }
  return items
}

// Helper to escape table cell values for markdown
const cell = (val) => {
  if (val === null || val === undefined) return ''
  return String(val)
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
}

// Helper to extract owner/repo from GitHub API repository URL
const getFullRepoFromUrl = (url) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts.slice(-2).join('/')
}

export default function ContributorProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { orgs, pat, pullsData } = useApp()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawContributions, setRawContributions] = useState([])
  const [mergedPRKeys, setMergedPRKeys] = useState(new Set())
  const [tab, setTab] = useState('prs')

  // Date Range Filters (Defaults to Last 1 Year)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  // Determine organizations to search with hardened local storage fallback
  const searchOrgs = useMemo(() => {
    let list = orgs.map(o => o.login)
    if (!list.length) {
      try {
        const rawRecent = localStorage.getItem('oe_recent')
        if (rawRecent) {
          const recent = JSON.parse(rawRecent)
          if (Array.isArray(recent) && recent.length && typeof recent[0] === 'string') {
            list = recent[0].split(',').map(s => s.trim()).filter(Boolean)
          }
        }
      } catch (e) {
        console.error('Failed to parse oe_recent from localStorage:', e)
      }
    }
    return list
  }, [orgs])

  // Fetch contributor issues & PRs from GitHub Search API (Supports pagination & cleanup)
  useEffect(() => {
    // Reset data states to prevent rendering stale profile info
    setRawContributions([])
    setMergedPRKeys(new Set())

    if (!username) {
      setLoading(false)
      return
    }

    if (!searchOrgs.length) {
      setError('No organizations found. Please explore at least one organization to view the contributor profile.')
      setLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()

    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const encodedUser = encodeURIComponent(username)
        const orgQuery = searchOrgs.map(org => `org:${encodeURIComponent(org)}`).join('+')
        const url = `https://api.github.com/search/issues?q=author:${encodedUser}+${orgQuery}&per_page=100`
        const mergedUrl = `https://api.github.com/search/issues?q=author:${encodedUser}+is:pr+is:merged+${orgQuery}&per_page=100`

        const headers = { Accept: 'application/vnd.github.v3+json' }
        if (pat) {
          headers.Authorization = `token ${pat}`
        }

        const [items, mergedItems] = await Promise.all([
          fetchAllPages(url, headers, controller.signal),
          fetchAllPages(mergedUrl, headers, controller.signal)
        ])

        if (!active) return

        const mergedKeys = new Set(
          mergedItems.map(item => {
            const repo = getFullRepoFromUrl(item.repository_url)
            return `${repo}/${item.number}`
          })
        )

        setMergedPRKeys(mergedKeys)
        setRawContributions(items)
      } catch (err) {
        if (!active) return
        if (err.name === 'AbortError') return
        if (err.message === 'RATE_LIMIT') {
          setError('GitHub API search rate limit reached. Please wait a minute or configure a PAT in Settings.')
        } else {
          setError(`Failed to fetch contributor details: ${err.message}`)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      active = false
      controller.abort()
    }
  }, [username, searchOrgs, pat])

  // Presets using local date offsets
  const setPreset = (type) => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    if (type === 'week') {
      const lastWeek = new Date(d)
      lastWeek.setDate(lastWeek.getDate() - 6)
      const lastWeekStr = `${lastWeek.getFullYear()}-${pad(lastWeek.getMonth() + 1)}-${pad(lastWeek.getDate())}`
      setStartDate(lastWeekStr)
      setEndDate(todayStr)
    } else if (type === 'month') {
      const thirtyDaysAgo = new Date(d)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${pad(thirtyDaysAgo.getMonth() + 1)}-${pad(thirtyDaysAgo.getDate())}`
      setStartDate(thirtyDaysAgoStr)
      setEndDate(todayStr)
    } else if (type === 'year') {
      const lastYear = new Date()
      lastYear.setFullYear(d.getFullYear() - 1)
      const lastYearStr = `${lastYear.getFullYear()}-${pad(lastYear.getMonth() + 1)}-${pad(lastYear.getDate())}`
      setStartDate(lastYearStr)
      setEndDate(todayStr)
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  // Filter contributions by UTC date range limits
  const filteredContribs = useMemo(() => {
    return rawContributions.filter(item => {
      const itemTime = new Date(item.created_at).getTime()
      if (startDate) {
        const startTime = Date.parse(startDate + 'T00:00:00.000Z')
        if (isNaN(startTime) || itemTime < startTime) return false
      }
      if (endDate) {
        const endTime = Date.parse(endDate + 'T23:59:59.999Z')
        if (isNaN(endTime) || itemTime > endTime) return false
      }
      return true
    })
  }, [rawContributions, startDate, endDate])

  // Categorize contributions (Precomputes pulls calculations outside loop)
  const { prs, issues } = useMemo(() => {
    const prList = []
    const issueList = []
    const localPulls = Object.values(pullsData || {}).flat()

    filteredContribs.forEach(item => {
      const repoName = item.repository_url ? item.repository_url.split('/').pop() : 'Unknown'
      const parsedItem = {
        ...item,
        repoName,
        isPR: Boolean(item.pull_request),
      }

      if (parsedItem.isPR) {
        let merged = false
        // Prioritize explicit merged_at property on PR item
        if (item.pull_request?.merged_at !== undefined && item.pull_request?.merged_at !== null) {
          merged = true
        } else {
          const fullRepo = getFullRepoFromUrl(item.repository_url)
          const localMatch = localPulls.find(p => p.number === item.number && p.base?.repo?.full_name === fullRepo)
          if (localMatch) {
            merged = Boolean(localMatch.merged_at)
          } else {
            merged = mergedPRKeys.has(`${fullRepo}/${item.number}`)
          }
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
  }, [filteredContribs, pullsData, mergedPRKeys])

  // Time-series charting data (Chronological sorting by YYYY-MM)
  const chartData = useMemo(() => {
    const monthlyBuckets = {}
    
    filteredContribs.forEach(item => {
      const date = new Date(item.created_at)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const yyyymm = `${year}-${month}`
      const displayName = date.toLocaleString('default', { month: 'short', year: '2-digit' }) // e.g. "May 26"
      
      if (!monthlyBuckets[yyyymm]) {
        monthlyBuckets[yyyymm] = { yyyymm, name: displayName, PRs: 0, Issues: 0 }
      }
      
      if (item.pull_request) {
        monthlyBuckets[yyyymm].PRs++
      } else {
        monthlyBuckets[yyyymm].Issues++
      }
    })

    return Object.values(monthlyBuckets).sort((a, b) => a.yyyymm.localeCompare(b.yyyymm))
  }, [filteredContribs])

  // Export to Markdown Report with pipe & newline escaping
  const exportMarkdown = () => {
    const dateStr = new Date().toLocaleDateString()
    const orgsStr = searchOrgs.join(', ')
    const dateRangeStr = (startDate || 'Beginning') + ' to ' + (endDate || 'Present')

    let md = `# Contribution Report: ${username}\n\n`
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
        md += `| ${cell(p.repoName)} | #${p.number} | ${cell(p.title)} | ${date} | **${status}** | [PR Link](${p.html_url}) |\n`
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
        md += `| ${cell(i.repoName)} | #${i.number} | ${cell(i.title)} | ${date} | **${status}** | [Issue Link](${i.html_url}) |\n`
      })
    } else {
      md += `No issues opened in this period.\n`
    }
    md += `\n`

    md += `---\n`
    md += `*Report generated automatically by **OrgExplorer**.*\n`

    // File download trigger (Hardened cleanup & revocation)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `contribution-report-${username}-${new Date().toISOString().slice(0, 10)}.md`
    })
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
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
            ...C.btn('primary'),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
          }}
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
            <FiDownload size={13} /> Export Contribution Report (.md)
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
            <button onClick={() => setPreset('week')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              Last Week
            </button>
            <button onClick={() => setPreset('month')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              Last 30 Days
            </button>
            <button onClick={() => setPreset('year')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              Last 1 Year
            </button>
            <button onClick={() => setPreset('all')} style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}>
              All Time
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="start-date-input" style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>START DATE</label>
            <input
              id="start-date-input"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={C.input}
            />
          </div>
          <span style={{ color: 'var(--text2)', marginTop: 18 }}>to</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="end-date-input" style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>END DATE</label>
            <input
              id="end-date-input"
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
          sub="distinct repositories"
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
          <ContributionTable
            items={prs}
            dateHeader="SUBMITTED ON"
            resolveStatus={(p) => {
              const status = p.state === 'open' ? 'Open' : p.isMerged ? 'Merged' : 'Closed'
              const color = status === 'Merged' ? 'var(--green)' : status === 'Open' ? 'var(--blue)' : 'var(--text2)'
              const bg = status === 'Merged' ? 'rgba(34,197,94,.12)' : status === 'Open' ? 'rgba(59,130,246,.12)' : 'var(--surface2)'
              return { status, color, bg }
            }}
          />
        ) : (
          <ContributionTable
            items={issues}
            dateHeader="CREATED ON"
            resolveStatus={(i) => {
              const status = i.state === 'open' ? 'Open' : 'Closed'
              const color = status === 'Open' ? 'var(--blue)' : 'var(--text2)'
              const bg = status === 'Open' ? 'rgba(59,130,246,.12)' : 'var(--surface2)'
              return { status, color, bg }
            }}
          />
        )}
      </div>
    </div>
  )
}
