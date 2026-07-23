import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiExternalLink, FiShare2, FiArrowRight } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, StatCard, HealthBar } from '../components/UI'
import SocialShareButton from '../components/SocialShareButton';
import { AiOutlineInfoCircle } from "react-icons/ai";
import AnalysisBanner from '../components/AnalysisBanner'
import { OverviewSkeleton } from '../components/Orgexplorerskeletons'

const LANG_COLORS = ['#22c55e', '#f5c518', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#06b6d4']
const fmt = n => n > 999 ? (n / 1000).toFixed(1) + 'k' : String(n)

export default function OverviewPage() {
  const { orgs, model, totalRepo, isComplete, loading, runFullExplore } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const infoRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if(loading) return <OverviewSkeleton />
  if (!model) return null

  const { totalRepos } = model
  const isMulti = orgs.length > 1
  const totalStars = totalRepos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = totalRepos.reduce((s, r) => s + r.forks_count, 0)
  const activeRepos = totalRepos.filter(r => r.activityClassification === 'Thriving' || r.activityClassification === 'Active').length

  const langMap = {}
  totalRepos.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1 })
  const langs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const langTotal = langs.reduce((s, [, c]) => s + c, 0)

  const topRepos = [...totalRepos].sort((a, b) => b.healthScore - a.healthScore).slice(0, 5)

  const NavCard = ({ to, label, sub }) => (
    <div
      onClick={() => navigate(to)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      style={{ ...C.card, cursor: 'pointer', transition: 'border-color .2s' }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, minHeight: 32 }}>{sub}</div>
      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        View {label} <FiArrowRight size={12} />
      </span>
    </div>
  )

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">

      <AnalysisBanner
        page="overview"
        description="Organization insights are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
        analysisStatus={isComplete ? 'complete' : 'standard'}
        loading={loading}
        onRun={runFullExplore}
      />

      {/* Org identity bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        {isMulti ? (
          <div style={{ display: 'flex' }}>
            {orgs.slice(0, 3).map((o, i) => o.avatar_url && (
              <img key={o.login} src={o.avatar_url} alt={o.login}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--bg)', marginLeft: i ? -10 : 0 }} />
            ))}
          </div>
        ) : (
          orgs[0]?.avatar_url && (
            <img src={orgs[0].avatar_url} alt="" style={{ width: 56, height: 56 }} />
          )
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            {isMulti ? orgs.map(o => o.login).join(' + ') : (orgs[0]?.name || orgs[0]?.login)}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
            {isMulti
              ? `${orgs.length} organizations — combined portfolio view`
              : (orgs[0]?.description || `@${orgs[0]?.login}`)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isMulti && orgs[0]?.html_url && (
            <a href={orgs[0].html_url} target="_blank" rel="noreferrer"
              style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <FiExternalLink size={13} /> View on GitHub
            </a>
          )}
          <SocialShareButton 
            theme="dark" 
            buttonStyle="ghost" 
            title={isMulti ? `OrgExplorer: ${orgs.map(o => o.login).join(' + ')}` : `OrgExplorer: ${orgs[0]?.name || orgs[0]?.login}`}
            description={isMulti ? `${orgs.length} organizations — combined portfolio view` : (orgs[0]?.description || `@${orgs[0]?.login}`)}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Repos" value={totalRepo.toLocaleString()} />
        <StatCard label="Total Stars" value={fmt(totalStars)} />
        <StatCard label="Total Forks" value={fmt(totalForks)} />
        <StatCard label="Active Repos" value={activeRepos} sub={`${Math.round(activeRepos / totalRepo * 100)}% of total`} />
      </div>

      {/* Language + top repos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={C.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Language Distribution</div>
          <div style={{ ...C.label, marginBottom: 16 }}>Technology Stack Analysis</div>
          <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
            {langs.map(([lang, count], i) => (
              <div key={lang} style={{ flex: count / langTotal, background: LANG_COLORS[i] }} title={lang} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {langs.map(([lang, count], i) => (
              <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[i] }} />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {lang} <strong style={{ color: 'var(--text)' }}>{Math.round(count / langTotal * 100)}%</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={C.card}
          className="relative"
        >
          <div className="flex justify-between items-center font-semibold" ref={infoRef}>
            <p>High Impact Repositories</p>

            <button
              onMouseEnter={()=>setOpen(true)}
              onMouseLeave={()=>setOpen(false)}
              className="p-3 rounded-full hover:bg-(--bg) transition"
            >
              <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
            </button>
          </div>

          {open && (
            <div
              className="absolute top-16 right-2 w-80 z-50 rounded-lg border-2 border-(--border) bg-(--surface) p-4 shadow-xl text-xs"
            >
              <strong>Health Score</strong> estimates the overall health of a repository on a scale of 0 – 100.

              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>
                  <strong>Activity (40%)</strong> – How recently the repository has been updated.
                </li>
                <li>
                  <strong>Issue Health (30%)</strong> – Balance between open issues and maintenance.
                </li>
                <li>
                  <strong>Contributor Diversity (30%)</strong> – Number of active contributors.
                </li>
              </ul>

              <p className="mt-2 text-xs text-(--text2)">
                Higher scores indicate healthier and more actively maintained repositories.
              </p>
            </div>
          )}
          <div style={{ ...C.label, marginBottom: 16 }}>By Composite Health Score</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topRepos.map(r => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{r.name}</span>
                </div>
                <HealthBar score={r.healthScore} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <NavCard to="/repositories" label="Repositories" sub="Explore and sort repos by health, and activity classification state" />
        <NavCard to="/contributors" label="Contributors" sub="Analyze contribution patterns, bus factor, and connector signals" />
        <NavCard to="/network" label="Network Graph" sub="Visualize contributor-repository relationships with D3 force graph" />
        <NavCard to="/analytics" label="Analytics" sub="Time-series PR and issue velocity — weekly and monthly trends" />
        <NavCard to="/governance" label="Governance" sub="Dead issues, zombie PRs, risky repos, license compliance" />
        <NavCard to="/settings" label="Settings" sub="PAT authentication, API quota monitoring, cache management" />
      </div>
    </div>
  )
}
