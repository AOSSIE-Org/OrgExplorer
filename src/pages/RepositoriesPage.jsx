import React, { useState, useMemo, useEffect, useRef } from 'react'
import { FiDatabase, FiDownload, FiGrid, FiList } from 'react-icons/fi'
import { AiOutlineInfoCircle } from "react-icons/ai";
import { useApp } from '../context/AppContext'
import { C, Badge, HealthBar, SortTh, PageTitle, LoadMore } from '../components/UI'
import { useSortedData } from '../hooks/useSortedData'
import { exportReposCSV } from '../services/analytics'
import EmptyStateCard from '../components/EmptyStateCard'
import { useNavigate } from 'react-router-dom'
import AnalysisBanner from '../components/AnalysisBanner'
import { RepositorySkeleton } from '../components/Orgexplorerskeletons';

const ACTIVITY_CLASSIFICATIONS = ['All', 'Thriving', 'Active', 'Dormant', 'Hibernating']
const ACTIVITY_COLORS = { Thriving: 'var(--green)', Active: 'var(--blue)', Dormant: 'var(--amber)', Hibernating: 'var(--red)' }

export default function RepositoriesPage() {
  const { model, isComplete, loading, runFullExplore } = useApp()
  const [search, setSearch] = useState('')
  const [activityClassification, setActivityClassification] = useState('All')
  const [lang, setLang] = useState('All Languages')
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
  const allRepos = model?.totalRepos ?? []

  const langs = useMemo(() =>
    ['All Languages', ...new Set(allRepos.map(r => r.language).filter(Boolean))].slice(0, 10),
    [allRepos])

  const filtered = useMemo(() => allRepos.filter(r =>
    (activityClassification === 'All' || r.activityClassification === activityClassification) &&
    (lang === 'All Languages' || r.language === lang) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase()))
  ), [allRepos, activityClassification, lang, search])

  const { sorted, sortConfig, onSort } = useSortedData(filtered, 'healthScore', 'desc')
  const visible = sorted.slice(0, shown)

  if(loading) return <RepositorySkeleton />
  if (!model) return null

  const TABLE_COLS = [
    ['name', 'Repository'],
    ['stargazers_count', 'Stars'],
    ['forks_count', 'Forks'],
    ['open_issues_count', 'Open Issues'],
    ['healthScore', 'Health'],
    ['pushed_at', 'Repository Activity'],
  ]

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner
        page="repositories"
        description="Repository insights are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={isComplete ? 'complete' : 'standard'}
        loading={loading}
        onRun={runFullExplore}
      />
      <div style={{ position: 'relative' }} ref={infoRef}>
        <PageTitle
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Repository Explorer

              <button
                onMouseEnter={() => setOpenInfo(true)}
                onMouseLeave={() => setOpenInfo(false)}
                className="p-3 rounded-full hover:bg-(--bg) transition"
              >
                <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
              </button>
            </div>
          }
          subtitle="Repository insights and activity classification across all repositories."
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
              OrgExplorer evaluates repositories using issue health,
              contributor diversity, and activity classification status.
            </p>

            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <strong>Health Score (0–100)</strong>
              <ul style={{ marginLeft: 18 }}>
                <li>Activity → 40%</li>
                <li>Issue Health → 30%</li>
                <li>Contributor Diversity → 30%</li>
              </ul>

              <strong>Activity Classification</strong>
              <ul style={{ marginLeft: 18 }}>
                <li>🟢 Thriving → Updated within 30 days</li>
                <li>🔵 Active → Updated within 90 days</li>
                <li>🟡 Dormant → Updated within 180 days</li>
                <li>🔴 Hibernating → No updates for 180+ days</li>
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
          <button onClick={() => exportReposCSV(filtered)} style={{ ...C.btn('ghost'), padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <FiDownload size={13} /> CSV
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {ACTIVITY_CLASSIFICATIONS.map(l => (
            <button
              key={l} onClick={() => { setActivityClassification(l); setShown(20) }}
              style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: activityClassification === l ? 'none' : '1px solid var(--border)',
                background: activityClassification === l ? (ACTIVITY_COLORS[l] || 'var(--accent)') : 'transparent',
                color: activityClassification === l ? '#000' : 'var(--text2)',
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
                      <a
                        href={`${r.html_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                        {r.orgLogin && <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.orgLogin}</div>}
                      </a>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{r.stargazers_count.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{r.forks_count.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: r.open_issues_count > 30 ? 'var(--red)' : 'var(--text2)' }}>{r.open_issues_count}</td>
                    <td style={{ padding: '10px 14px', minWidth: 130 }}><HealthBar score={r.healthScore} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Badge text={r.activityClassification} />
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                          Last push: {r.pushed_at?.slice(0, 10)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <LoadMore shown={shown} total={sorted.length} onLoad={() => setShown(s => s + 20)} />
          </div>
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
