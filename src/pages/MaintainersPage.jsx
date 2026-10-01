import React, { useState, useMemo, useEffect } from 'react'
import { FiUsers, FiExternalLink, FiInfo } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, SortTh, PageTitle, LoadMore, StatCard, Spinner } from '../components/UI'
import { useSortedData } from '../hooks/useSortedData'
import { enrichMaintainerPRs, MAINTAINER_PR_PER_REPO, MAINTAINER_PR_TOTAL_CAP } from '../services/github'
import { computeMaintainerAttribution } from '../services/analytics'
import { useNavigate } from 'react-router-dom'
import EmptyStateCard from '../components/EmptyStateCard'

// A maintainer is "Active" if their most recent merge/review was within this window.
const ACTIVE_DAYS = 30

function isActive(lastActive) {
  if (!lastActive) return false
  const days = (Date.now() - new Date(lastActive)) / 86_400_000
  return Number.isFinite(days) && days <= ACTIVE_DAYS
}

export default function MaintainersPage() {
  const { pat, pullsData, orgs, advanceAnalyticsLoading } = useApp()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(20)
  const [selectedOrg, setSelectedOrg] = useState('all')
  const [enrichedPRs, setEnrichedPRs] = useState([])
  const [enriching, setEnriching] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const hasPulls = pullsData && Object.keys(pullsData).length > 0
  const organizationOptions = useMemo(() => (orgs ?? []).map(o => o.login), [orgs])

  // Enrich recent PRs once (org filtering happens after, in-memory).
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!pat || !hasPulls) { setEnrichedPRs([]); return }
      setEnriching(true)
      const enriched = await enrichMaintainerPRs(pullsData, pat)
      if (cancelled) return
      setEnrichedPRs(enriched)
      setEnriching(false)
    }
    run()
    return () => { cancelled = true }
  }, [pat, pullsData, hasPulls])

  // Attribute per-maintainer, scoped to the selected org.
  const rows = useMemo(() => {
    const scoped = selectedOrg === 'all'
      ? enrichedPRs
      : enrichedPRs.filter(pr => pr.org === selectedOrg)
    return computeMaintainerAttribution(scoped)
  }, [enrichedPRs, selectedOrg])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.login.toLowerCase().includes(q))
  }, [rows, search])

  const { sorted, sortConfig, onSort } = useSortedData(filtered, 'merged', 'desc')
  const visible = sorted.slice(0, shown)

  const totalMerged = rows.reduce((s, r) => s + r.merged, 0)
  const totalReviewed = rows.reduce((s, r) => s + r.reviewed, 0)
  const activeCount = rows.filter(r => isActive(r.lastActive)).length

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <PageTitle
        title="Maintainer Intelligence"
        subtitle={`Merge and review activity across recent PRs (up to ${MAINTAINER_PR_PER_REPO} per repo, ${MAINTAINER_PR_TOTAL_CAP} total)`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Maintainers" value={activeCount} sub={`Active in last ${ACTIVE_DAYS} days`} />
        <StatCard label="PRs Merged" value={totalMerged} accent="var(--green)" />
        <StatCard label="PRs Reviewed" value={totalReviewed} accent="var(--purple)" />
      </div>

      {!pat ? (
        <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
          <EmptyStateCard
            SvgIcon={<FiUsers size={36} color="var(--accent)" />}
            title="Add a Personal Access Token"
            description="Maintainer attribution reads per-PR merge and review data, which needs an authenticated GitHub token. Add a PAT in Settings to see this page."
            buttonText="Go to Settings"
            onButtonClick={() => navigate('/settings')}
          />
        </div>
      ) : !hasPulls ? (
        <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
          <EmptyStateCard
            SvgIcon={<FiUsers size={36} color="var(--accent)" />}
            title="No pull request data yet"
            description="Run the advanced analytics explore first so maintainer activity can be computed from pull requests."
            buttonText="Go to Home"
            onButtonClick={() => navigate('/')}
          />
        </div>
      ) : (enriching || advanceAnalyticsLoading) ? (
        <div style={{ ...C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48 }}>
          <Spinner /> <span style={{ color: 'var(--text2)', fontSize: 14 }}>Analyzing maintainer activity…</span>
        </div>
      ) : (
        <div style={{ ...C.card, padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by username..."
              style={{ ...C.input, width: 220 }}
            />
            {organizationOptions.length > 0 && (
              <select
                value={selectedOrg}
                onChange={e => { setSelectedOrg(e.target.value); setShown(20) }}
                style={{ ...C.input, width: 200 }}
              >
                <option value="all">All Organizations</option>
                {organizationOptions.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            )}
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{filtered.length} maintainers found</span>

            {/* SIGNALS-style info tooltip */}
            <span
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto', color: 'var(--text2)', cursor: 'help' }}
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
            >
              <FiInfo size={15} />
              {showInfo && (
                <div style={{ position: 'absolute', top: '120%', right: 0, width: 300, zIndex: 10, ...C.card, padding: 14, fontSize: 12, lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent)' }}>Maintainer Signals</strong>
                  <p style={{ margin: '8px 0 0', color: 'var(--text2)' }}>
                    <strong>PRs Merged</strong> — pull requests this person merged.<br />
                    <strong>PRs Reviewed</strong> — pull requests they submitted a review on.<br />
                    <strong>Repos</strong> — distinct repositories they merged or reviewed in.<br />
                    <strong>Active</strong> — merged or reviewed within the last {ACTIVE_DAYS} days.
                  </p>
                </div>
              )}
            </span>
          </div>

          {filtered.length ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortTh label="Maintainer" sortKey="login" sortConfig={sortConfig} onSort={onSort} />
                    <SortTh label="PRs Merged" sortKey="merged" sortConfig={sortConfig} onSort={onSort} />
                    <SortTh label="PRs Reviewed" sortKey="reviewed" sortConfig={sortConfig} onSort={onSort} />
                    <SortTh label="Repos" sortKey="repos" sortConfig={sortConfig} onSort={onSort} />
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text2)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m, i) => (
                    <tr key={m.login} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {m.avatar ? <img src={m.avatar} alt={m.login} style={{ width: 28, height: 28, borderRadius: '50%' }} /> : null}
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{m.login}</span>
                          <a
                            href={`https://github.com/${m.login}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text2)', opacity: 0.7 }}
                            title="View GitHub profile" aria-label="View GitHub profile"
                          >
                            <FiExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{m.merged}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{m.reviewed}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{m.repos}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {isActive(m.lastActive) && <span style={C.pill('var(--green)', 'rgba(34,197,94,.12)')}>ACTIVE</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMore shown={shown} total={sorted.length} onLoad={() => setShown(s => s + 20)} />
            </>
          ) : (
            <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
              <EmptyStateCard
                SvgIcon={<FiUsers size={36} color="var(--accent)" />}
                title={search.trim() ? 'No matching maintainers' : 'No maintainer activity found'}
                description={search.trim() ? `No maintainers match "${search}".` : 'No merges or reviews found in the recent PRs.'}
                buttonText="Go to Home"
                onButtonClick={() => navigate('/')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}