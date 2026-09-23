import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FiX,
  FiExternalLink,
  FiActivity,
  FiAlertCircle,
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiShield,
  FiCode,
  FiStar,
  FiGitPullRequest,
  FiCalendar,
  FiBookOpen
} from 'react-icons/fi'
import { C } from './UI'
import { computeHealthBreakdown, getHealthRecommendations } from '../services/analytics'

export default function RepoHealthDrawer({ repo, onClose, isOpen }) {
  const [activeTab, setActiveTab] = useState('breakdown')
  const drawerRef = useRef(null)

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap / initial focus
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [isOpen])

  const contributorCount = useMemo(() => {
    if (Array.isArray(repo?.contributors)) return repo.contributors.length
    if (typeof repo?.contributors_count === 'number') return repo.contributors_count
    return 0
  }, [repo])

  const breakdown = useMemo(() => {
    if (!repo) return null
    return computeHealthBreakdown(repo, contributorCount)
  }, [repo, contributorCount])

  const recommendations = useMemo(() => {
    if (!repo) return []
    return getHealthRecommendations(repo, contributorCount)
  }, [repo, contributorCount])

  if (!isOpen || !repo) return null

  const overallScore = breakdown?.overall ?? repo.healthScore ?? 0
  const scoreColor = overallScore >= 70 ? 'var(--green)' : overallScore >= 40 ? 'var(--amber)' : 'var(--red)'
  const scoreRating = overallScore >= 70 ? 'Healthy' : overallScore >= 40 ? 'Moderate Risk' : 'Needs Attention'

  const REC_STYLES = {
    critical: {
      border: 'var(--red)',
      bg: 'rgba(239, 68, 68, 0.08)',
      badge: 'Critical',
      icon: FiAlertCircle,
      color: 'var(--red)',
    },
    warning: {
      border: 'var(--amber)',
      bg: 'rgba(245, 158, 11, 0.08)',
      badge: 'Warning',
      icon: FiAlertTriangle,
      color: 'var(--amber)',
    },
    optimization: {
      border: 'var(--blue)',
      bg: 'rgba(59, 130, 246, 0.08)',
      badge: 'Optimization',
      icon: FiInfo,
      color: 'var(--blue)',
    },
    good: {
      border: 'var(--green)',
      bg: 'rgba(34, 197, 94, 0.08)',
      badge: 'Good Practice',
      icon: FiCheckCircle,
      color: 'var(--green)',
    },
  }

  const rawMetricsList = [
    { label: 'Repository', value: repo.name, icon: FiBookOpen },
    { label: 'Organization', value: repo.orgLogin || 'N/A', icon: FiUsers },
    { label: 'Primary Language', value: repo.language || 'Not specified', icon: FiCode },
    { label: 'Stars', value: (repo.stargazers_count ?? 0).toLocaleString(), icon: FiStar },
    { label: 'Forks', value: (repo.forks_count ?? 0).toLocaleString(), icon: FiGitPullRequest },
    { label: 'Open Issues', value: (repo.open_issues_count ?? 0).toLocaleString(), icon: FiAlertCircle },
    {
      label: 'License',
      value: repo.license?.spdx_id || repo.license?.name || (typeof repo.license === 'string' ? repo.license : 'None detected'),
      icon: FiShield,
    },
    { label: 'Default Branch', value: repo.default_branch || 'main', icon: FiCode },
    { label: 'Activity Classification', value: repo.activityClassification || 'Unknown', icon: FiActivity },
    { label: 'Recorded Contributors', value: contributorCount.toString(), icon: FiUsers },
    {
      label: 'Bus Factor Risk',
      value: repo.busFactor?.risk ? repo.busFactor.risk.toUpperCase() : 'UNKNOWN',
      icon: FiShield,
    },
    {
      label: 'Last Push Date',
      value: repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never',
      icon: FiCalendar,
    },
    {
      label: 'Created Date',
      value: repo.created_at ? new Date(repo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown',
      icon: FiCalendar,
    },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="health-drawer-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          transition: 'opacity 0.25s ease',
        }}
        data-testid="drawer-backdrop"
      />

      {/* Drawer content */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.45)',
          zIndex: 10000,
          outline: 'none',
        }}
        className="fade-left"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--surface2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={C.label}>Repository Health Inspector</span>
            <button
              onClick={onClose}
              aria-label="Close health details"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="hover:text-(--text) hover:bg-(--surface)"
            >
              <FiX size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <h2
                id="health-drawer-title"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {repo.name}
                {repo.html_url && (
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--text2)', display: 'inline-flex', alignItems: 'center' }}
                    title="Open on GitHub"
                  >
                    <FiExternalLink size={15} />
                  </a>
                )}
              </h2>
              {repo.orgLogin && (
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                  Organization: <strong style={{ color: 'var(--text)' }}>{repo.orgLogin}</strong>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                  fontSize: 26,
                  fontWeight: 800,
                  color: scoreColor,
                }}
              >
                {overallScore}
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>/ 100</span>
              </div>
              <span
                style={{
                  ...C.pill(scoreColor, `${scoreColor}22`),
                  fontSize: 10,
                  padding: '1px 6px',
                  marginTop: 2,
                }}
              >
                {scoreRating.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid var(--border)',
              marginTop: 4,
              paddingBottom: 2,
            }}
          >
            {[
              { id: 'breakdown', label: 'Score Breakdown' },
              { id: 'recommendations', label: `Recommendations (${recommendations.length})` },
              { id: 'raw', label: 'Raw Metrics' },
            ].map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                    color: active ? 'var(--text)' : 'var(--text2)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB 1: BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Score formula card */}
              <div
                style={{
                  ...C.card,
                  background: 'var(--surface2)',
                  borderColor: 'var(--border)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FiInfo size={16} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Scoring Formula</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  The repository composite health score is calculated as a weighted average across three key dimensions:
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span>Activity (40%)</span>
                  <span>+</span>
                  <span>Issue Health (30%)</span>
                  <span>+</span>
                  <span>Diversity (30%)</span>
                </div>
              </div>

              {/* Category cards */}
              {breakdown?.categories.map((cat) => {
                const catColor =
                  cat.score >= 70 ? 'var(--green)' : cat.score >= 40 ? 'var(--amber)' : 'var(--red)'
                return (
                  <div
                    key={cat.id}
                    style={{
                      ...C.card,
                      border: '1px solid var(--border)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                        <span style={C.pill('var(--accent)', 'rgba(245, 197, 24, 0.12)')}>
                          {Math.round(cat.weight * 100)}% WEIGHT
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: 15, color: catColor }}>{cat.score}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>
                          (+{cat.weightedScore} pts)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 6,
                        width: '100%',
                        background: 'var(--surface2)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${cat.score}%`,
                          background: catColor,
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                      {cat.description}
                    </p>

                    {/* Metrics grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 8,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      {cat.metrics.map((m, i) => (
                        <div key={i} style={{ fontSize: 11 }}>
                          <span style={{ color: 'var(--text2)', display: 'block' }}>{m.label}</span>
                          <strong style={{ color: 'var(--text)', fontSize: 12 }}>{m.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 2: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recommendations.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text2)' }}>
                  <FiCheckCircle size={32} color="var(--green)" style={{ marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, fontSize: 14 }}>No current recommendations</p>
                  <p style={{ fontSize: 12 }}>This repository is meeting all active health benchmarks.</p>
                </div>
              ) : (
                recommendations.map((rec, i) => {
                  const styleCfg = REC_STYLES[rec.type] || REC_STYLES.warning
                  const Icon = styleCfg.icon
                  return (
                    <div
                      key={i}
                      style={{
                        ...C.card,
                        padding: '16px',
                        borderLeft: `4px solid ${styleCfg.border}`,
                        background: styleCfg.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon size={16} color={styleCfg.color} />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{rec.title}</span>
                        </div>
                        <span style={C.pill(styleCfg.color, `${styleCfg.color}22`)}>
                          {styleCfg.badge.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
                        {rec.description}
                      </p>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                        Category: <strong style={{ color: 'var(--text)' }}>{rec.category}</strong>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TAB 3: RAW METRICS */}
          {activeTab === 'raw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>
                Direct repository metrics and indicators obtained from GitHub API.
              </p>
              <div
                style={{
                  ...C.card,
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {rawMetricsList.map((metric, i) => {
                      const Icon = metric.icon
                      return (
                        <tr
                          key={metric.label}
                          style={{
                            borderBottom: i < rawMetricsList.length - 1 ? '1px solid var(--border)' : 'none',
                            background: i % 2 ? 'var(--surface2)' : 'transparent',
                          }}
                        >
                          <td
                            style={{
                              padding: '10px 16px',
                              fontSize: 12,
                              color: 'var(--text2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '45%',
                            }}
                          >
                            <Icon size={14} style={{ opacity: 0.7 }} />
                            {metric.label}
                          </td>
                          <td
                            style={{
                              padding: '10px 16px',
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text)',
                            }}
                          >
                            {metric.value}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
