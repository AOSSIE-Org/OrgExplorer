import React, { useState, useMemo } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiMessageSquare,
  FiUser,
  FiFolder,
  FiSearch,
  FiExternalLink,
  FiClock,
  FiDatabase,
  FiTag,
  FiFilter
} from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, PageTitle } from '../components/UI'
import EmptyStateCard from '../components/EmptyStateCard'
import AnalysisBanner from '../components/AnalysisBanner'
import { useNavigate } from 'react-router-dom'

export default function IssuesPage() {
  const { model, issuesData, loading } = useApp()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState('All Organizations')
  const [repoFilter, setRepoFilter] = useState('All Repositories')
  const [stateFilter, setStateFilter] = useState('open') // 'open', 'closed', 'all'
  const [groupBy, setGroupBy] = useState('none') // 'none', 'repo', 'author'
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Aggregate all issues from issuesData
  const allIssues = useMemo(() => {
    if (!issuesData || Object.keys(issuesData).length === 0) return []
    const list = []
    Object.entries(issuesData).forEach(([repoKey, issues]) => {
      if (!Array.isArray(issues)) return
      const [orgLogin, repoName] = repoKey.split('/')
      issues.forEach(item => {
        // Exclude pull requests (GitHub API includes PRs in issues endpoint)
        if (item.pull_request) return
        list.push({
          ...item,
          orgLogin: orgLogin || item.repository_url?.split('/')?.slice(-2, -1)[0] || '',
          repoName: repoName || item.repository_url?.split('/')?.slice(-1)[0] || '',
          repoKey,
        })
      })
    })
    return list
  }, [issuesData])

  // Extract orgs list for filter dropdown
  const orgList = useMemo(() => {
    const orgs = new Set(allIssues.map(i => i.orgLogin).filter(Boolean))
    return ['All Organizations', ...Array.from(orgs)]
  }, [allIssues])

  // Extract repos list for filter dropdown
  const repoList = useMemo(() => {
    const repos = new Set(
      allIssues
        .filter(i => orgFilter === 'All Organizations' || i.orgLogin === orgFilter)
        .map(i => i.repoName)
        .filter(Boolean)
    )
    return ['All Repositories', ...Array.from(repos)]
  }, [allIssues, orgFilter])

  // Filter issues
  const filteredIssues = useMemo(() => {
    return allIssues.filter(issue => {
      // State filter
      if (stateFilter !== 'all' && issue.state !== stateFilter) return false

      // Org filter
      if (orgFilter !== 'All Organizations' && issue.orgLogin !== orgFilter) return false

      // Repo filter
      if (repoFilter !== 'All Repositories' && issue.repoName !== repoFilter) return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const titleMatch = issue.title?.toLowerCase().includes(q)
        const numberMatch = String(issue.number).includes(q)
        const authorMatch = issue.user?.login?.toLowerCase().includes(q)
        const assigneeMatch = issue.assignee?.login?.toLowerCase().includes(q)
        const labelMatch = issue.labels?.some(l => l.name?.toLowerCase().includes(q))
        if (!titleMatch && !numberMatch && !authorMatch && !assigneeMatch && !labelMatch) {
          return false
        }
      }
      return true
    })
  }, [allIssues, stateFilter, orgFilter, repoFilter, search])

  // Summary Metrics
  const metrics = useMemo(() => {
    const openCount = allIssues.filter(i => i.state === 'open').length
    const closedCount = allIssues.filter(i => i.state === 'closed').length
    const affectedRepos = new Set(allIssues.map(i => i.repoKey)).size
    const authors = new Set(allIssues.map(i => i.user?.login).filter(Boolean)).size
    return { openCount, closedCount, affectedRepos, authors }
  }, [allIssues])

  // Reset page when filters change
  useMemo(() => {
    setPage(1)
  }, [search, orgFilter, repoFilter, stateFilter, groupBy])

  // Grouping logic
  const groupedIssues = useMemo(() => {
    if (groupBy === 'repo') {
      const map = {}
      filteredIssues.forEach(issue => {
        const key = `${issue.orgLogin}/${issue.repoName}`
        if (!map[key]) map[key] = []
        map[key].push(issue)
      })
      return map
    } else if (groupBy === 'author') {
      const map = {}
      filteredIssues.forEach(issue => {
        const key = issue.user?.login || 'Unknown'
        if (!map[key]) map[key] = []
        map[key].push(issue)
      })
      return map
    }
    return null
  }, [filteredIssues, groupBy])

  // Pagination for flat list view
  const totalPages = Math.ceil(filteredIssues.length / pageSize) || 1
  const paginatedIssues = useMemo(() => {
    if (groupBy !== 'none') return filteredIssues
    const start = (page - 1) * pageSize
    return filteredIssues.slice(start, start + pageSize)
  }, [filteredIssues, page, pageSize, groupBy])

  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <PageTitle title="Issues" subtitle="Loading issues analysis..." />
        <div style={{ ...C.card, textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
          Loading issue data across repositories...
        </div>
      </div>
    )
  }

  if (!model || allIssues.length === 0) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <AnalysisBanner page="issues" />
        <PageTitle title="Issues" subtitle="Explore open issues across repositories and teams." />
        <div style={{ maxWidth: 900, margin: '32px auto' }}>
          <EmptyStateCard
            SvgIcon={<FiDatabase size={36} color="var(--accent)" />}
            title="No Issues Data Available"
            description="Run an analysis from the home page to inspect issues across your repositories."
            buttonText="Go to Home"
            onButtonClick={() => navigate('/')}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner page="issues" />

      <PageTitle
        title="Issues Explorer"
        subtitle="View, search, filter, and group open issues across repositories and teams."
      />

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <FiAlertCircle size={16} /> Open Issues
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{metrics.openCount.toLocaleString()}</div>
        </div>

        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--purple, #a855f7)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <FiCheckCircle size={16} /> Closed Issues
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{metrics.closedCount.toLocaleString()}</div>
        </div>

        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <FiFolder size={16} /> Repositories
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{metrics.affectedRepos.toLocaleString()}</div>
        </div>

        <div style={C.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue, #3b82f6)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <FiUser size={16} /> Issue Creators
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{metrics.authors.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div style={{ ...C.card, marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              type="text"
              placeholder="Search issues, #number, author, label..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...C.input, width: '100%', paddingLeft: 34 }}
            />
          </div>

          {/* Org Filter */}
          {orgList.length > 2 && (
            <select
              value={orgFilter}
              onChange={e => { setOrgFilter(e.target.value); setRepoFilter('All Repositories') }}
              style={C.select}
            >
              {orgList.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {/* Repo Filter */}
          <select
            value={repoFilter}
            onChange={e => setRepoFilter(e.target.value)}
            style={C.select}
          >
            {repoList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* State Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 6, padding: 3, border: '1px solid var(--border)' }}>
            {['open', 'closed', 'all'].map(s => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: stateFilter === s ? 'var(--accent)' : 'transparent',
                  color: stateFilter === s ? '#000' : 'var(--text2)',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease'
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Group By Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <FiFilter size={13} /> Group by:
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={C.select}>
              <option value="none">Flat List</option>
              <option value="repo">By Repository</option>
              <option value="author">By Author</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
          Showing <strong>{filteredIssues.length}</strong> {stateFilter} {filteredIssues.length === 1 ? 'issue' : 'issues'}
        </div>
      </div>

      {/* Issue Items / Grouped Views */}
      {filteredIssues.length === 0 ? (
        <div style={{ ...C.card, textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          No issues match your current filter criteria.
        </div>
      ) : groupBy !== 'none' ? (
        // Grouped View (by Repo or Author)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedIssues || {}).map(([groupKey, issues]) => (
            <div key={groupKey} style={C.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                {groupBy === 'repo' ? <FiFolder size={16} color="var(--accent)" /> : <FiUser size={16} color="var(--accent)" />}
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{groupKey}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 10 }}>
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {issues.map(issue => (
                  <IssueRow key={issue.id || issue.number} issue={issue} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat List View with Pagination
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {paginatedIssues.map(issue => (
              <IssueRow key={issue.id || issue.number} issue={issue} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ ...C.btn('ghost'), opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ ...C.btn('ghost'), opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Sub-component for individual issue row
function IssueRow({ issue }) {
  const isOpen = issue.state === 'open'
  const createdDate = new Date(issue.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--surface2)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        transition: 'border-color 0.15s ease'
      }}
    >
      {/* State Icon */}
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        {isOpen ? (
          <FiAlertCircle size={16} color="var(--green)" title="Open Issue" />
        ) : (
          <FiCheckCircle size={16} color="var(--purple, #a855f7)" title="Closed Issue" />
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
              textDecoration: 'none',
              lineHeight: 1.3
            }}
            onMouseOver={e => e.target.style.color = 'var(--accent)'}
            onMouseOut={e => e.target.style.color = 'var(--text)'}
          >
            {issue.title}
          </a>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
            #{issue.number}
          </span>
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text3)', display: 'inline-flex', alignItems: 'center' }}
            title="Open on GitHub"
          >
            <FiExternalLink size={12} />
          </a>
        </div>

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {issue.labels.map(l => {
              const bgHex = l.color ? `#${l.color}` : 'var(--surface)'
              return (
                <span
                  key={l.id || l.name}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: `${bgHex}22`,
                    color: l.color ? `#${l.color}` : 'var(--text2)',
                    border: `1px solid ${bgHex}44`
                  }}
                >
                  {l.name}
                </span>
              )
            })}
          </div>
        )}

        {/* Meta Line */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiFolder size={11} /> {issue.orgLogin}/{issue.repoName}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiClock size={11} /> {createdDate}
          </span>

          {issue.user && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {issue.user.avatar_url && (
                <img
                  src={issue.user.avatar_url}
                  alt={issue.user.login}
                  style={{ width: 14, height: 14, borderRadius: '50%' }}
                />
              )}
              Author: <strong>{issue.user.login}</strong>
            </span>
          )}

          {issue.assignee ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {issue.assignee.avatar_url && (
                <img
                  src={issue.assignee.avatar_url}
                  alt={issue.assignee.login}
                  style={{ width: 14, height: 14, borderRadius: '50%' }}
                />
              )}
              Assignee: <strong>{issue.assignee.login}</strong>
            </span>
          ) : (
            <span style={{ color: 'var(--text3)' }}>Unassigned</span>
          )}
        </div>
      </div>

      {/* Comment Count */}
      {issue.comments > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
            background: 'var(--surface)',
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          <FiMessageSquare size={12} />
          {issue.comments}
        </div>
      )}
    </div>
  )
}
