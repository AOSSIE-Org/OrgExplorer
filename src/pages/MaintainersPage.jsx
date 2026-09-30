import React, { useState, useMemo, useEffect } from 'react'
import { FiUsers, FiDownload, FiExternalLink } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, SortTh, PageTitle, LoadMore, StatCard, Spinner } from '../components/UI'
import { useSortedData } from '../hooks/useSortedData'
import { enrichMaintainerPRs, MAINTAINER_PR_PER_REPO } from '../services/github'
import { computeMaintainerAttribution } from '../services/analytics'
import { useNavigate } from 'react-router-dom'
import EmptyStateCard from '../components/EmptyStateCard'

export default function MaintainersPage() {
  const { pat, pullsData, advanceAnalyticsLoading } = useApp()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(20)
  const [rows, setRows] = useState([])
  const [enriching, setEnriching] = useState(false)

  const hasPulls = pullsData && Object.keys(pullsData).length > 0

  // Enrich the recent PRs with merged_by + reviewers, then attribute per maintainer.
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!pat || !hasPulls) { setRows([]); return }
      setEnriching(true)
      const enriched = await enrichMaintainerPRs(pullsData, pat)
      if (cancelled) return
      setRows(computeMaintainerAttribution(enriched))
      setEnriching(false)
    }
    run()
    return () => { cancelled = true }
  }, [pat, pullsData, hasPulls])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.login.toLowerCase().includes(q))
  }, [rows, search])

  const { sorted, sortConfig, onSort } = useSortedData(filtered, 'merged', 'desc')
  const visible = sorted.slice(0, shown)

  const totalMerged = rows.reduce((s, r) => s + r.merged, 0)
  const totalReviewed = rows.reduce((s, r) => s + r.reviewed, 0)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <PageTitle
        title="Maintainer Intelligence"
        subtitle={`Merge and review activity across the ${MAINTAINER_PR_PER_REPO} most recent PRs per repository`}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Maintainers" value={rows.length} />
        <StatCard label="PRs Merged" value={totalMerged} accent="var(--green)" />
        <StatCard label="PRs Reviewed" value={totalReviewed} accent="var(--purple)" />
      </div>

      {/* Gating states */}
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
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{filtered.length} maintainers found</span>
          </div>

          {filtered.length ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortTh label="Maintainer" sortKey="login" sortConfig={sortConfig} onSort={onSort} />
                    <SortTh label="PRs Merged" sortKey="merged" sortConfig={sortConfig} onSort={onSort} />
                    <SortTh label="PRs Reviewed" sortKey="reviewed" sortConfig={sortConfig} onSort={onSort} />
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
                            className="hover:opacity-100 hover:text-(--accent)"
                          >
                            <FiExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{m.merged}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{m.reviewed}</td>
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