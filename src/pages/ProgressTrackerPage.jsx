import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { C, PageTitle, Spinner, StatCard } from '../components/UI'
import { 
  FiArrowLeft, FiCalendar, FiCheckSquare, FiSquare, 
  FiExternalLink, FiDownload, FiInfo, FiAlertTriangle, FiRefreshCw, FiGrid
} from 'react-icons/fi'

// Reusable pagination helper
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

const getFullRepoFromUrl = (url) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts.slice(-2).join('/')
}

export default function ProgressTrackerPage() {
  const navigate = useNavigate()
  const { model, orgs, pat, pullsData } = useApp()

  const contributors = useMemo(() => model?.contributors ?? [], [model])

  // Date controls
  const [startDate, setStartDate] = useState('2026-05-18') // Default to GSoC Coding Period
  const [endDate, setEndDate] = useState('2026-08-24')

  // Selected contributors
  const [selectedLogins, setSelectedLogins] = useState(new Set())
  const [searchFilter, setSearchFilter] = useState('')

  // Contribution data cache map
  const [cache, setCache] = useState({})
  const [loadingMap, setLoadingMap] = useState({})
  const [errorMap, setErrorMap] = useState({})

  // Detail Modal State
  const [modalData, setModalData] = useState(null)

  // Orgs to search
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

  // Setup default contributor selection (top 10 active)
  useEffect(() => {
    if (contributors.length > 0 && selectedLogins.size === 0) {
      const topLogins = contributors.slice(0, 10).map(c => c.login)
      setSelectedLogins(new Set(topLogins))
    }
  }, [contributors])

  // Calculate weeks dynamically
  const weeks = useMemo(() => {
    if (!startDate || !endDate) return []
    const list = []
    let current = new Date(startDate + 'T00:00:00.000Z')
    const endLimit = new Date(endDate + 'T23:59:59.999Z')

    if (isNaN(current.getTime()) || isNaN(endLimit.getTime()) || current >= endLimit) {
      return []
    }

    let wNum = 1
    while (current < endLimit) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current.getTime() + 6 * 24 * 60 * 60 * 1000)
      weekEnd.setHours(23, 59, 59, 999)

      list.push({
        number: wNum++,
        start: weekStart,
        end: weekEnd > endLimit ? endLimit : weekEnd,
      })
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
    return list
  }, [startDate, endDate])

  // AbortController refs to cancel pending fetches
  const abortControllersRef = useRef({})

  // Cleanup fetches on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(ctrl => ctrl.abort())
    }
  }, [])

  // Trigger parallel data fetching for selected contributors
  useEffect(() => {
    if (!searchOrgs.length) return

    selectedLogins.forEach(login => {
      // Skip if already in cache or currently loading
      if (cache[login] || loadingMap[login]) return

      const ctrl = new AbortController()
      abortControllersRef.current[login] = ctrl

      setLoadingMap(prev => ({ ...prev, [login]: true }))
      setErrorMap(prev => ({ ...prev, [login]: '' }))

      const encodedUser = encodeURIComponent(login)
      const orgQuery = searchOrgs.map(org => `org:${encodeURIComponent(org)}`).join('+')
      const url = `https://api.github.com/search/issues?q=author:${encodedUser}+${orgQuery}&per_page=100`
      const mergedUrl = `https://api.github.com/search/issues?q=author:${encodedUser}+is:pr+is:merged+${orgQuery}&per_page=100`

      const headers = { Accept: 'application/vnd.github.v3+json' }
      if (pat) {
        headers.Authorization = `token ${pat}`
      }

      Promise.all([
        fetchAllPages(url, headers, ctrl.signal),
        fetchAllPages(mergedUrl, headers, ctrl.signal)
      ]).then(([items, mergedItems]) => {
        const mergedKeys = new Set(
          mergedItems.map(item => {
            const repo = getFullRepoFromUrl(item.repository_url)
            return `${repo}/${item.number}`
          })
        )

        const localPulls = Object.values(pullsData || {}).flat()
        const parsed = items.map(item => {
          const repoName = item.repository_url ? item.repository_url.split('/').pop() : 'Unknown'
          const fullRepo = getFullRepoFromUrl(item.repository_url)
          const isPR = Boolean(item.pull_request)
          let isMerged = false
          if (isPR) {
            if (item.pull_request?.merged_at !== undefined && item.pull_request?.merged_at !== null) {
              isMerged = true
            } else {
              const localMatch = localPulls.find(p => p.number === item.number && p.base?.repo?.full_name === fullRepo)
              if (localMatch) {
                isMerged = Boolean(localMatch.merged_at)
              } else {
                isMerged = mergedKeys.has(`${fullRepo}/${item.number}`)
              }
            }
          }

          return {
            id: item.id,
            number: item.number,
            title: item.title,
            html_url: item.html_url,
            state: item.state,
            created_at: item.created_at,
            repoName,
            fullRepo,
            isPR,
            isMerged
          }
        })

        setCache(prev => ({ ...prev, [login]: parsed }))
        setLoadingMap(prev => ({ ...prev, [login]: false }))
      }).catch(err => {
        if (err.name === 'AbortError') return
        console.error(`Failed loading progress for ${login}:`, err)
        setErrorMap(prev => ({ ...prev, [login]: err.message === 'RATE_LIMIT' ? 'Rate Limit' : 'Failed' }))
        setLoadingMap(prev => ({ ...prev, [login]: false }))
      })
    })
  }, [selectedLogins, searchOrgs, pat, pullsData])

  // Contributor selection handlers
  const toggleSelect = (login) => {
    setSelectedLogins(prev => {
      const next = new Set(prev)
      if (next.has(login)) {
        next.delete(login)
        if (abortControllersRef.current[login]) {
          abortControllersRef.current[login].abort()
          delete abortControllersRef.current[login]
        }
      } else {
        next.add(login)
      }
      return next
    })
  }

  const selectPreset = (type) => {
    if (type === 'top5') {
      setSelectedLogins(new Set(contributors.slice(0, 5).map(c => c.login)))
    } else if (type === 'top10') {
      setSelectedLogins(new Set(contributors.slice(0, 10).map(c => c.login)))
    } else {
      setSelectedLogins(new Set())
    }
  }

  // Filter contributor list in sidebar
  const filteredContributors = useMemo(() => {
    return contributors.filter(c => c.login.toLowerCase().includes(searchFilter.toLowerCase()))
  }, [contributors, searchFilter])

  // Group metrics by week for a contributor
  const getWeeklyStats = (login, week) => {
    const list = cache[login] || []
    const weekStart = week.start.getTime()
    const weekEnd = week.end.getTime()

    const weekItems = list.filter(item => {
      const time = new Date(item.created_at).getTime()
      return time >= weekStart && time <= weekEnd
    })

    const mergedPRs = weekItems.filter(item => item.isPR && item.isMerged)
    const openPRs = weekItems.filter(item => item.isPR && item.state === 'open')
    const closedPRs = weekItems.filter(item => item.isPR && !item.isMerged && item.state === 'closed')
    const issuesList = weekItems.filter(item => !item.isPR)

    return {
      merged: mergedPRs.length,
      open: openPRs.length,
      closed: closedPRs.length,
      issues: issuesList.length,
      items: weekItems
    }
  }

  // Export Matrix to CSV
  const exportCSV = () => {
    if (selectedLogins.size === 0 || weeks.length === 0) return

    let csvContent = 'data:text/csv;charset=utf-8,'
    // Header
    const weekHeaders = weeks.map(w => `Week ${w.number} (${w.start.toISOString().slice(0, 10)})`).join(',')
    csvContent += `Contributor,Total PRs,Total Issues,${weekHeaders}\n`

    selectedLogins.forEach(login => {
      const list = cache[login] || []
      const prCount = list.filter(i => i.isPR).length
      const issueCount = list.filter(i => !i.isPR).length

      const weekStats = weeks.map(w => {
        const stats = getWeeklyStats(login, w)
        return `"${stats.merged} Merged / ${stats.open} Open / ${stats.issues} Issues"`
      }).join(',')

      csvContent += `${login},${prCount},${issueCount},${weekStats}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = Object.assign(document.createElement('a'), {
      href: encodedUri,
      download: `weekly-progress-matrix-${new Date().toISOString().slice(0, 10)}.csv`
    })
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!model) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Spinner size={36} />
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Please search and select an organization first...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }} className="fade-up">
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
        title="Weekly Progress Matrix"
        subtitle=" CENTRALIZED WEEKLY CONTRIBUTIONS TRACKER DASHBOARD"
        right={
          <button
            onClick={exportCSV}
            disabled={selectedLogins.size === 0 || weeks.length === 0}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <FiDownload size={13} /> Export Progress CSV
          </button>
        }
      />

      {/* Configuration Header Card */}
      <div style={{ ...C.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiCalendar size={15} color="var(--text2)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Matrix Window Configurator</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              onClick={() => {
                setStartDate('2026-05-18')
                setEndDate('2026-08-24')
              }} 
              style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}
            >
              GSoC 2026 Range
            </button>
            <button 
              onClick={() => {
                const now = new Date()
                const start = new Date(Date.now() - 90 * 86_400_000)
                const pad = (n) => String(n).padStart(2, '0')
                setStartDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`)
                setEndDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
              }} 
              style={{ ...C.btn('ghost'), fontSize: 11, padding: '4px 10px' }}
            >
              Last 90 Days
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="matrix-start-date" style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>START DATE</label>
            <input
              id="matrix-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={C.input}
            />
          </div>
          <span style={{ color: 'var(--text2)', marginTop: 18 }}>to</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="matrix-end-date" style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>END DATE</label>
            <input
              id="matrix-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={C.input}
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Panel: Contributor List Selector */}
        <div style={{ ...C.card, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Select Contributors</span>
            <span style={{ fontSize: 10, background: 'var(--border)', padding: '2px 6px', borderRadius: 10, color: 'var(--text2)' }}>
              {selectedLogins.size}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            <button onClick={() => selectPreset('top5')} style={{ flex: 1, padding: '4px 6px', fontSize: 10, ...C.btn('ghost') }}>Top 5</button>
            <button onClick={() => selectPreset('top10')} style={{ flex: 1, padding: '4px 6px', fontSize: 10, ...C.btn('ghost') }}>Top 10</button>
            <button onClick={() => selectPreset('clear')} style={{ flex: 1, padding: '4px 6px', fontSize: 10, ...C.btn('ghost') }}>Clear</button>
          </div>

          <input
            type="text"
            placeholder="Search username..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{ ...C.input, width: '100%', padding: '6px 10px', fontSize: 12, marginBottom: 12 }}
          />

          <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredContributors.map(c => {
              const checked = selectedLogins.has(c.login)
              return (
                <div 
                  key={c.login} 
                  onClick={() => toggleSelect(c.login)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    background: checked ? 'var(--surface2)' : 'transparent'
                  }}
                  className="hover:bg-(--surface2) transition"
                >
                  {checked ? <FiCheckSquare color="var(--accent)" /> : <FiSquare color="var(--text2)" />}
                  <span style={{ fontWeight: checked ? 500 : 400, color: checked ? 'var(--text)' : 'var(--text2)' }}>
                    {c.login}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel: Matrix Grid */}
        <div style={{ ...C.card, overflowX: 'auto', padding: 0 }}>
          {selectedLogins.size === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text2)' }}>
              <FiGrid size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 13 }}>Please select at least one contributor in the sidebar panel to view progress.</p>
            </div>
          ) : weeks.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text2)' }}>
              <FiAlertTriangle size={32} color="var(--amber)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Invalid date range. Check start/end configurations.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text2)', minWidth: 160 }}>CONTRIBUTOR</th>
                  {weeks.map(w => (
                    <th key={w.number} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text2)', minWidth: 110 }}>
                      <div>Week {w.number}</div>
                      <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>
                        {w.start.toLocaleString('default', { month: 'short', day: 'numeric' })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(selectedLogins).map((login, index) => {
                  const contrib = contributors.find(c => c.login === login)
                  const isLoading = loadingMap[login]
                  const hasErr = errorMap[login]
                  const dataItems = cache[login] || []

                  return (
                    <tr key={login} style={{ borderBottom: '1px solid var(--border)', background: index % 2 ? 'var(--surface2)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {contrib?.avatar_url ? (
                          <img src={contrib.avatar_url} alt={login} style={{ width: 26, height: 26, borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--border)' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{login}</div>
                          <span style={{ fontSize: 10, color: 'var(--text2)' }}>{dataItems.length} elements</span>
                        </div>
                      </td>

                      {weeks.map(w => {
                        if (isLoading) {
                          return (
                            <td key={w.number} style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <Spinner size={12} />
                            </td>
                          )
                        }

                        if (hasErr) {
                          return (
                            <td key={w.number} style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--red)' }}>
                              {hasErr}
                            </td>
                          )
                        }

                        const stats = getWeeklyStats(login, w)
                        const total = stats.merged + stats.open + stats.issues

                        return (
                          <td 
                            key={w.number} 
                            onClick={() => {
                              if (total > 0) {
                                setModalData({
                                  contributor: login,
                                  week: w.number,
                                  range: `${w.start.toLocaleDateString()} - ${w.end.toLocaleDateString()}`,
                                  items: stats.items
                                })
                              }
                            }}
                            style={{ 
                              padding: '12px 16px', 
                              textAlign: 'center',
                              cursor: total > 0 ? 'pointer' : 'default',
                              background: total > 0 ? 'rgba(59,130,246,.02)' : 'transparent'
                            }}
                            className={total > 0 ? "hover:bg-blue-50/10 transition" : ""}
                          >
                            {total > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 3 }}>
                                  {stats.merged > 0 && <span style={{ ...C.pill('var(--green)', 'rgba(34,197,94,.1)'), fontSize: 10 }}>{stats.merged}M</span>}
                                  {stats.open > 0 && <span style={{ ...C.pill('var(--blue)', 'rgba(59,130,246,.1)'), fontSize: 10 }}>{stats.open}O</span>}
                                  {stats.issues > 0 && <span style={{ ...C.pill('var(--amber)', 'rgba(245,158,11,.1)'), fontSize: 10 }}>{stats.issues}I</span>}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text2)', opacity: 0.4 }}>-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Weekly Details Modal Popup */}
      {modalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            ...C.card, width: '100%', maxWidth: 700, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', gap: 16, padding: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,.3)', border: '1px solid var(--border)'
          }} className="fade-up">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Weekly Contributions</h3>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  @{modalData.contributor} • Week {modalData.week} ({modalData.range})
                </span>
              </div>
              <button 
                onClick={() => setModalData(null)}
                style={{ ...C.btn('ghost'), padding: '4px 8px', fontSize: 11 }}
              >
                Close
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {modalData.items.map(item => {
                const type = item.isPR ? (item.isMerged ? 'Merged PR' : item.state === 'open' ? 'Open PR' : 'Closed PR') : 'Issue'
                const typeColor = type.includes('Merged') ? 'var(--green)' : type.includes('Open') ? 'var(--blue)' : 'var(--amber)'
                const typeBg = type.includes('Merged') ? 'rgba(34,197,94,.1)' : type.includes('Open') ? 'rgba(59,130,246,.1)' : 'rgba(245,158,11,.1)'

                return (
                  <div 
                    key={item.id}
                    style={{
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: 12, display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', gap: 12
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span style={C.pill(typeColor, typeBg)}>{type.toUpperCase()}</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.repoName} #{item.number}</span>
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</div>
                    </div>
                    <a 
                      href={item.html_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ ...C.btn('ghost'), display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                    >
                      <FiExternalLink size={12} /> GitHub
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
