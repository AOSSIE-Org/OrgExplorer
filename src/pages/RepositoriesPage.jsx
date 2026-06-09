import React, { useState, useMemo, useEffect, useRef } from 'react'
import { FiDatabase, FiDownload, FiGrid, FiList } from 'react-icons/fi'
import { BsFillInfoSquareFill } from "react-icons/bs";
import { useApp } from '../context/AppContext'
import { C, Badge, HealthBar, SortTh, PageTitle, LoadMore } from '../components/UI'
import { useSortedData } from '../hooks/useSortedData'
import { exportReposCSV } from '../services/analytics'
import EmptyStateCard from '../components/EmptyStateCard'
import { useNavigate } from 'react-router-dom'

const LIFECYCLES = ['All', 'Thriving', 'Stable', 'Dormant', 'Abandoned']
const LC_ACTIVE = { Thriving: 'var(--green)', Stable: 'var(--blue)', Dormant: 'var(--amber)', Abandoned: 'var(--red)' }

export default function RepositoriesPage() {
  const { model } = useApp()
  const [search, setSearch] = useState('')
  const [lifecycle, setLifecycle] = useState('All')
  const [lang, setLang] = useState('All')
  const [view, setView] = useState('grid')
  const [shown, setShown] = useState(20)
  const [openInfo, setOpenInfo] = useState(false)
  const infoRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        infoRef.current &&
        !infoRef.current.contains(event.target)
      ) {
        setOpenInfo(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const navigate = useNavigate()
  if (!model) return null
  const { allRepos } = model

  const langs = useMemo(() =>
    ['All', ...new Set(allRepos.map(r => r.language).filter(Boolean))].slice(0, 10),
    [allRepos])

  const filtered = useMemo(() => allRepos.filter(r =>
    (lifecycle === 'All' || r.lifecycle === lifecycle) &&
    (lang === 'All' || r.language === lang) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase()))
  ), [allRepos, lifecycle, lang, search])

  const { sorted, sortConfig, onSort } = useSortedData(filtered, 'healthScore', 'desc')
  const visible = sorted.slice(0, shown)

  const TABLE_COLS = [
    ['name', 'Repository'],
    ['stargazers_count', 'Stars'],
    ['forks_count', 'Forks'],
    ['open_issues_count', 'Open Issues'],
    ['healthScore', 'Health'],
    ['lifecycle', 'Lifecycle'],
    ['pushed_at', 'Last Push'],
  ]

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <div style={{ position: 'relative' }} ref={infoRef}>
        <PageTitle
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Repository Explorer

              <button
                onClick={() => setOpenInfo(prev => !prev)}
                className="p-3 rounded-full hover:bg-zinc-800 transition"
              >
                <BsFillInfoSquareFill className='size-4' />
              </button>
            </div>
          }
          subtitle="Technical health and lifecycle across all repositories in the portfolio"
          right={
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
              {filtered.length}
              <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 400 }}>
                {' '} / {allRepos.length} repos
              </span>
            </span>
          }
        />

        {openInfo && (
          <div
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              width: 420,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,.4)'
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 10,
                color: 'var(--accent)'
              }}
            >
              Repository Health Metrics
            </div>

            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              OrgExplorer evaluates repositories using activity, issue health,
              contributor diversity, and lifecycle status.
            </p>

            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <strong>Health Score (0–100)</strong>
              <ul style={{ marginLeft: 18 }}>
                <li>Activity → 40%</li>
                <li>Issue Health → 30%</li>
                <li>Contributor Diversity → 30%</li>
              </ul>

              <strong>Lifecycle Classification</strong>
              <ul style={{ marginLeft: 18 }}>
                <li>🟢 Thriving → Updated within 30 days</li>
                <li>🔵 Stable → Updated within 90 days</li>
                <li>🟡 Dormant → Updated within 180 days</li>
                <li>🔴 Abandoned → No updates for 180+ days</li>
              </ul>

              <strong>Repository Signals</strong>
              <ul style={{ marginLeft: 18 }}>
                <li>Stars → Community interest</li>
                <li>Forks → Adoption & contributions</li>
                <li>Issues → Current maintenance workload</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ ...C.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by repository name or description..."
            style={{ ...C.input, flex: 1, minWidth: 200 }}
          />
          <select value={lang} onChange={e => setLang(e.target.value)} style={C.select}>
            {langs.map(l => <option key={l}>{l}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setView('grid')} style={{ ...C.btn(view === 'grid' ? 'primary' : 'ghost'), padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <FiGrid size={13} /> Grid
            </button>
            <button onClick={() => setView('list')} style={{ ...C.btn(view === 'list' ? 'primary' : 'ghost'), padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <FiList size={13} /> Table
            </button>
          </div>
          <button onClick={() => exportReposCSV(filtered)} style={{ ...C.btn('ghost'), padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <FiDownload size={13} /> CSV
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {LIFECYCLES.map(l => (
            <button
              key={l} onClick={() => { setLifecycle(l); setShown(20) }}
              style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: lifecycle === l ? 'none' : '1px solid var(--border)',
                background: lifecycle === l ? (LC_ACTIVE[l] || 'var(--accent)') : 'transparent',
                color: lifecycle === l ? '#000' : 'var(--text2)',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {allRepos?.length ? (
        <>
          {/* Table view */}
          {view === 'list' && (
            <div style={{ ...C.card, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {TABLE_COLS.map(([k, l]) => (
                      <SortTh key={k} label={l} sortKey={k} sortConfig={sortConfig} onSort={onSort} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                        {r.orgLogin && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.orgLogin}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{r.stargazers_count.toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{r.forks_count.toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: r.open_issues_count > 30 ? 'var(--red)' : 'var(--text2)' }}>{r.open_issues_count}</td>
                      <td style={{ padding: '10px 14px', minWidth: 130 }}><HealthBar score={r.healthScore} /></td>
                      <td style={{ padding: '10px 14px' }}><Badge text={r.lifecycle} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>{r.pushed_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMore shown={shown} total={sorted.length} onLoad={() => setShown(s => s + 20)} />
            </div>
          )}

          {/* Grid view */}
          {view === 'grid' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                {visible.map(r => (
                  <div
                    key={r.id}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor =
                      r.lifecycle === 'Thriving' ? 'rgba(34,197,94,.25)' :
                        r.lifecycle === 'Abandoned' ? 'rgba(239,68,68,.25)' : 'var(--border)'}
                    style={{
                      ...C.card,
                      borderColor: r.lifecycle === 'Thriving' ? 'rgba(34,197,94,.25)' : r.lifecycle === 'Abandoned' ? 'rgba(239,68,68,.25)' : 'var(--border)',
                      transition: 'border-color .2s', display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                        {r.orgLogin && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.orgLogin}</div>}
                      </div>
                      <Badge text={r.lifecycle} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', minHeight: 34, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.description || 'No description provided'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center', gap: 4 }}>
                      {[['Stars', r.stargazers_count.toLocaleString()], ['Forks', r.forks_count.toLocaleString()], ['Issues', r.open_issues_count]].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                          <div style={{ ...C.label, fontSize: 10 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {r.language && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                        {r.language}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                        <span>HEALTH SCORE</span>
                        <span>{r.pushed_at?.slice(0, 10)}</span>
                      </div>
                      <HealthBar score={r.healthScore} />
                    </div>
                    <div style={{ ...C.label, fontSize: 10 }}>ACTIVITY 40% · ISSUES 30% · DIVERSITY 30%</div>
                  </div>
                ))}
              </div>
              <LoadMore shown={shown} total={sorted.length} onLoad={() => setShown(s => s + 20)} />
            </>
          )}
        </>)
        : (
          <div
            style={{
              padding: '32px 24px',
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            <EmptyStateCard
              SvgIcon={<FiDatabase size={36} color="var(--accent)" />}
              title="No repositories available"
              description="We couldn't find any repositories for this organization yet."
              buttonText="Go to Home"
              onButtonClick={() => navigate('/')}
            />
          </div>
        )}
    </div>
  )
}
