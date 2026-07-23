import React, { useState, useMemo, useEffect, useRef } from 'react'
import { FiDatabase, FiDownload } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, SortTh, PageTitle, LoadMore } from '../components/UI'
import { useSortedData } from '../hooks/useSortedData'
import { computeBusFactor, exportContributorsCSV } from '../services/analytics'
import { useNavigate } from 'react-router-dom'
import EmptyStateCard from '../components/EmptyStateCard'
import { AiOutlineInfoCircle } from "react-icons/ai";
import AnalysisBanner from '../components/AnalysisBanner'
import { ContributorSkeleton } from '../components/Orgexplorerskeletons'

export default function ContributorsPage() {
  const { model, isComplete, loading, runFullExplore } = useApp()
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(20)
  const [openInfo, setOpenInfo] = useState(null)
  const busFactorRef = useRef(null)
  const freshnessRef = useRef(null)
  const signalRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        busFactorRef.current &&
        busFactorRef.current.contains(e.target)
      ) return

      if (
        freshnessRef.current &&
        freshnessRef.current.contains(e.target)
      ) return

      if (
        signalRef.current &&
        signalRef.current.contains(e.target)
      ) return

      setOpenInfo(null)
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () =>
      document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navigate = useNavigate()
  const contributors = model?.contributors ?? []

  const busFactor = useMemo(() => computeBusFactor(contributors), [contributors])

  const filtered = useMemo(() =>
    contributors.filter(c => !search || c.login.toLowerCase().includes(search.toLowerCase())),
    [contributors, search])

  const { sorted, sortConfig, onSort } = useSortedData(filtered, 'totalContribs', 'desc')
  const visible = sorted.slice(0, shown)

  if(loading) return <ContributorSkeleton />
  if (!model) return null

  const topActive = contributors.slice(0, 10).filter(c => c.freshness > 50).length
  const freshPct = contributors.length ? Math.round(topActive / Math.min(10, contributors.length) * 100) : 0
  const connectors = contributors.filter(c => c.isConnector)
  const crossOrg = contributors.filter(c => c.isCrossOrg)

  const riskColor = r => r === 'critical' ? 'var(--red)' : r === 'high' ? 'var(--amber)' : 'var(--green)'
  const riskBar = r => r === 'critical' ? '90%' : r === 'high' ? '60%' : '25%'

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">

      <AnalysisBanner
        page="contributors"
        description="Contributor insights are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={isComplete ? 'complete' : 'standard'}
        loading={loading}
        onRun={runFullExplore}
      />

      <PageTitle
        title="Contributor Intelligence"
        subtitle="Analyzing contribution patterns, coverage risk, and organizational health"
        right={
          <button onClick={() => exportContributorsCSV(contributors)} style={{ ...C.btn('ghost'), fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <FiDownload size={13} /> Export CSV
          </button>
        }
      />

      {/* Signal panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Bus Factor */}
        <div style={{
          ...C.card,
          borderColor: busFactor.risk === 'critical' ? 'rgba(239,68,68,.4)' : busFactor.risk === 'high' ? 'rgba(245,158,11,.4)' : 'var(--border)',
        }}>
          <div ref={busFactorRef}
            style={{ ...C.label, marginBottom: 8, position: 'relative' }}
            className="flex justify-between items-center"
          >
            <p>Bus Factor Risk</p>

            <button
              onMouseEnter={() => setOpenInfo("busfactor")}
              onMouseLeave={() => setOpenInfo(null)}
              className="p-2 rounded-full hover:bg-(--bg) transition"
            >
              <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
            </button>

            {openInfo === 'busfactor' && (
              <div style={{ ...C.card, position: 'absolute', top: '120%', right: 0, width: '320px', zIndex: 100 }}>
                <div className='text-xs text-(--text)'>
                  <h4 style={{ marginBottom: 8 }} className='text-(--accent)'>Bus Factor</h4>

                  <p> Measures contributor concentration risk. </p>

                  <ul style={{ marginLeft: 16 }}>
                    <li>1 = Critical Risk</li>
                    <li>2 = High Risk</li>
                    <li>3+ = Healthy Distribution</li>
                  </ul>
                </div>

                <p style={{ marginTop: 8 }}>
                  Higher values indicate knowledge is distributed across more contributors,
                  reducing dependency on a small number of individuals.
                </p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Bus Factor: {busFactor.factor}</div>
            <span style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: `color-mix(in srgb, ${riskColor(busFactor.risk)} 15%, transparent)`,
              color: riskColor(busFactor.risk), letterSpacing: '.05em',
            }}>
              {busFactor.risk.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
            {busFactor.factor <= 2
              ? `${busFactor.factor} contributor${busFactor.factor === 1 ? '' : 's'} own${busFactor.factor === 1 ? 's' : ''} over 50% of total commits. Knowledge distribution is heavily skewed.`
              : 'Healthy contributor distribution across the organization.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            <span>RISK LEVEL</span>
            <span style={{ color: riskColor(busFactor.risk), fontWeight: 600 }}>{busFactor.risk.toUpperCase()}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ width: riskBar(busFactor.risk), height: '100%', background: riskColor(busFactor.risk), borderRadius: 2 }} />
          </div>
        </div>

        {/* Freshness Index */}
        <div style={C.card}>
          <div ref={freshnessRef}
            style={{ ...C.label, marginBottom: 12, position: 'relative' }}
            className="flex justify-between items-center"
          >
            <p>Freshness Index</p>

            <button
              onMouseEnter={() => setOpenInfo("freshness")}
              onMouseLeave={() => setOpenInfo(null)}
              className="p-2 rounded-full hover:bg-(--bg) transition"
            >
              <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
            </button>

            {openInfo === 'freshness' && (
              <div
                style={{
                  ...C.card,
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '320px',
                  zIndex: 100,
                }}
                className='text-xs'
              >
                <div className="text-(--text) text-xs">
                  <h4 className='text-(--accent)'>Freshness Index</h4>

                  <p>
                    Measures how active and recently engaged the contributor community is.
                  </p>

                  <ul className="ml-2">
                    <li><strong>High Score</strong> = Contributors active recently</li>
                    <li><strong>Medium Score</strong> = Some recent activity</li>
                    <li><strong>Low Score</strong> = Limited recent participation</li>
                  </ul>
                </div>

                <p style={{ marginTop: 8 }}>
                  Higher values indicate stronger project momentum and ongoing maintenance.
                </p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(var(--green) ${freshPct * 3.6}deg, var(--border) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
                {Math.round(freshPct / 10)}/10
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Core Momentum</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{topActive} of top 10 contributors active in last 90 days</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                ACTIVE RECENTLY: <strong style={{ color: 'var(--green)' }}>{freshPct}%</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {connectors.length > 0 && (
              <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(245,197,24,.06)', borderRadius: 4, fontSize: 12 }}>
                <strong style={{ color: 'var(--accent)' }}>{connectors.length}</strong> cross-repo connectors (3+ repos)
              </div>
            )}
            {crossOrg.length > 0 && (
              <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(168,85,247,.06)', borderRadius: 4, fontSize: 12 }}>
                <strong style={{ color: 'var(--purple)' }}>{crossOrg.length}</strong> cross-org contributors
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytical table */}
      <div style={{ ...C.card, padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username..."
            style={{ ...C.input, width: 220 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            {filtered.length} contributors found
          </span>
        </div>
        {contributors?.length ?
          (<>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <SortTh label="Contributor" sortKey="login" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Total Contributions" sortKey="totalContribs" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Repos Contributed To" sortKey="repos" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Orgs" sortKey="orgs" sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Last Active" sortKey="lastActive" sortConfig={sortConfig} onSort={onSort} />
                  <th
                    style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', textAlign: 'left', position: 'relative' }}
                    ref={signalRef}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ position: 'relative' }}
                    >
                      <p>SIGNALS</p>

                      <button
                        onMouseEnter={() => setOpenInfo("signals")}
                        onMouseLeave={() => setOpenInfo(null)}
                        className="p-2 rounded-full hover:bg-(--bg) transition"
                      >
                        <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
                      </button>

                      {openInfo === 'signals' && (
                        <div
                          style={{
                            ...C.card,
                            position: 'absolute',
                            top: '130%',
                            right: 2,
                            width: '320px',
                            zIndex: 100,
                          }}
                        >
                          <h4 className='mb-2 text-(--accent)'>Contributor Signals</h4>

                          <div className="text-(--text) text-xs">
                            <p>
                              Measures how contributors connect repositories and organizations.
                            </p>

                            <ul className="ml-2 mt-2">
                              <li>
                                <strong>Connector Contributors</strong> — active in 3+ repositories.
                              </li>
                              <li>
                                <strong>Cross-Org Contributors</strong> — contribute across multiple organizations.
                              </li>
                            </ul></div>

                          <p style={{ marginTop: 8 }}>
                            Higher values indicate stronger collaboration and knowledge sharing.
                          </p>
                        </div>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => (
                  <tr key={c.login} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <a
                        href={`https://github.com/${c.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={c.avatar_url} alt={c.login} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{c.login}</span>
                        </div>
                      </a>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ width: `${Math.min(100, c.totalContribs / 15)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.totalContribs.toLocaleString()}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{c.repos.length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>{c.orgs.length}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>{c.lastActive?.slice(0, 10) || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.isConnector && <span style={C.pill('var(--accent)', 'rgba(245,197,24,.12)')}>CONNECTOR</span>}
                        {c.isCrossOrg && <span style={C.pill('var(--purple)', 'rgba(168,85,247,.12)')}>CROSS-ORG</span>}
                        {c.freshness > 70 && <span style={C.pill('var(--green)', 'rgba(34,197,94,.12)')}>ACTIVE</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <LoadMore shown={shown} total={sorted.length} onLoad={() => setShown(s => s + 20)} /></>) :
          (<>
            <div
              style={{
                padding: '32px 24px',
                maxWidth: 900,
                margin: '0 auto',
              }}
            >
              <EmptyStateCard
                SvgIcon={<FiDatabase size={36} color='var(--accent)' />}
                title="No contributors found"
                description="We couldn't find any contributor data for this organization. "
                buttonText="Go to Home"
                onButtonClick={() => navigate('/')} />
            </div>
          </>)}
      </div>
    </div >
  )
}
