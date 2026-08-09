import React, { useState, useMemo } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiExternalLink, FiShield, FiTrendingUp, FiUsers, FiFileText } from 'react-icons/fi'
import { C, EmptyOk } from './UI'
import { computeOrgHealthSummary } from '../services/healthScorecard'
import { classifyRepositoryRisk, generateRiskRecommendations } from '../services/riskAdvisor'

export default function HealthScorecard({ model, issuesData = {}, hasAudit = false, onRunAudit, govLoading = false }) {
  const [filter, setFilter] = useState('all') // 'all' | 'critical' | 'warning' | 'healthy'

  const summary = useMemo(() => computeOrgHealthSummary(model, issuesData, hasAudit), [model, issuesData, hasAudit])
  const recommendations = useMemo(() => generateRiskRecommendations(model, issuesData), [model, issuesData])

  // Classify all repositories
  const repoRisks = useMemo(() => {
    if (!model || !model.allRepos) return []
    return model.allRepos.map(repo => {
      const risk = classifyRepositoryRisk(repo, issuesData)
      return {
        ...repo,
        riskTier: risk.tier,
        mainIssue: risk.mainIssue,
        score: repo.healthScore || 50,
      }
    })
  }, [model, issuesData])

  const counts = useMemo(() => {
    const crit = repoRisks.filter(r => r.riskTier === 'critical').length
    const warn = repoRisks.filter(r => r.riskTier === 'warning').length
    const heal = repoRisks.filter(r => r.riskTier === 'healthy').length
    return { critical: crit, warning: warn, healthy: heal }
  }, [repoRisks])

  const filteredRepos = useMemo(() => {
    if (filter === 'all') return repoRisks
    return repoRisks.filter(r => r.riskTier === filter)
  }, [repoRisks, filter])

  if (!model || !model.allRepos || model.allRepos.length === 0) {
    return <EmptyOk msg="No repository data available" sub="Please select an organization to view health scorecard." />
  }

  // Grade color map
  const gradeColors = {
    'A+': { color: 'var(--green)', bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.4)' },
    'A':  { color: 'var(--green)', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.3)' },
    'B':  { color: 'var(--blue)',  bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.3)' },
    'C':  { color: 'var(--amber)', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)' },
    'D':  { color: 'var(--orange)', bg: 'rgba(249,115,22,.12)', border: 'rgba(249,115,22,.3)' },
    'F':  { color: 'var(--red)',   bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.3)' },
  }

  const currentGradeStyle = gradeColors[summary.grade] || gradeColors['C']

  const DimensionBar = ({ label, score, icon: Icon, isPendingAudit = false }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
          <Icon size={14} style={{ color: 'var(--accent)' }} />
          <span>{label}</span>
        </div>
        <div>
          {isPendingAudit ? (
            <span style={{ fontSize: 11, color: 'var(--amber)', background: 'rgba(245,158,11,.12)', padding: '2px 8px', borderRadius: 4 }}>
              Insufficient Data (Audit Pending)
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)' }}>
              {score} / 100
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {!isPendingAudit && (
          <div
            style={{
              width: `${score}%`,
              height: '100%',
              background: score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        )}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Card: Grade & Risk Counter Chips */}
      <div style={{ ...C.card, padding: 24, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, borderRight: '1px solid var(--border)', paddingRight: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 16,
            background: currentGradeStyle.bg,
            border: `2px solid ${currentGradeStyle.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: currentGradeStyle.color, lineHeight: 1 }}>{summary.grade}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginTop: 2 }}>GRADE</span>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
              Organization Health
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, margin: '2px 0' }}>
              {summary.score} <span style={{ fontSize: 16, color: 'var(--text3)', fontWeight: 400 }}>/ 100</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Evaluated across {summary.totalRepos} repositories
            </div>
          </div>
        </div>

        {/* Risk Counter Chips */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 12 }}>
            ORGANIZATION RISK CLASSIFICATION
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div
              onClick={() => setFilter('critical')}
              style={{
                flex: 1, minWidth: 110, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                background: filter === 'critical' ? 'rgba(239,68,68,.2)' : 'var(--surface2)',
                border: filter === 'critical' ? '1px solid var(--red)' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                <FiAlertTriangle size={13} /> Critical
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--red)' }}>{counts.critical}</div>
            </div>

            <div
              onClick={() => setFilter('warning')}
              style={{
                flex: 1, minWidth: 110, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                background: filter === 'warning' ? 'rgba(245,158,11,.2)' : 'var(--surface2)',
                border: filter === 'warning' ? '1px solid var(--amber)' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
                <FiInfo size={13} /> Warning
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--amber)' }}>{counts.warning}</div>
            </div>

            <div
              onClick={() => setFilter('healthy')}
              style={{
                flex: 1, minWidth: 110, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                background: filter === 'healthy' ? 'rgba(34,197,94,.2)' : 'var(--surface2)',
                border: filter === 'healthy' ? '1px solid var(--green)' : '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                <FiCheckCircle size={13} /> Healthy
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--green)' }}>{counts.healthy}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Health Dimensions Panel */}
      <div style={C.card}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Health Dimensions</div>
        <div style={{ ...C.label, marginBottom: 16 }}>Key performance factors shaping the organization score</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <DimensionBar label="Activity & Push Velocity" score={summary.dimensions.activity} icon={FiTrendingUp} />
          <DimensionBar label="Maintainer Diversity" score={summary.dimensions.diversity} icon={FiUsers} />
          <DimensionBar label="License Compliance" score={summary.dimensions.compliance} icon={FiFileText} />
          <DimensionBar label="Issue & PR Resolution Health" score={summary.dimensions.issueHealth || 0} icon={FiShield} isPendingAudit={!summary.dimensions.hasAudit} />
        </div>
        {!hasAudit && onRunAudit && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,158,11,.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Run issue audit to populate Issue & PR Resolution Health score.</span>
            <button onClick={onRunAudit} disabled={govLoading} style={{ ...C.btn('primary'), fontSize: 11, padding: '4px 10px' }}>
              Run Audit
            </button>
          </div>
        )}
      </div>

      {/* 3. ⚡ Risk Advisor Panel */}
      <div style={C.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          <span>⚡ Risk Advisor</span>
        </div>
        <div style={{ ...C.label, marginBottom: 16 }}>Automated priority recommendations for org maintainers</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recommendations.map(rec => {
            const isCrit = rec.severity === 'critical'
            const isWarn = rec.severity === 'warning'
            const borderColor = isCrit ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--green)'
            const bg = isCrit ? 'rgba(239,68,68,.06)' : isWarn ? 'rgba(245,158,11,.06)' : 'rgba(34,197,94,.06)'

            return (
              <div key={rec.id} style={{ padding: '14px 16px', background: bg, borderLeft: `4px solid ${borderColor}`, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isCrit && <FiAlertTriangle color="var(--red)" size={14} />}
                    {isWarn && <FiInfo color="var(--amber)" size={14} />}
                    {!isCrit && !isWarn && <FiCheckCircle color="var(--green)" size={14} />}
                    <span>{rec.title}</span>
                  </div>
                  {rec.htmlUrl && (
                    <a href={rec.htmlUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <FiExternalLink size={11} /> {rec.action}
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                  {rec.description}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Repository Risk Table */}
      <div style={C.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Repository Risk Classification</div>
            <div style={{ ...C.label, marginTop: 2 }}>Breakdown of repositories filtered by risk signals</div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: `All (${repoRisks.length})` },
              { key: 'critical', label: `Critical (${counts.critical})` },
              { key: 'warning', label: `Warning (${counts.warning})` },
              { key: 'healthy', label: `Healthy (${counts.healthy})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  background: filter === tab.key ? 'var(--surface2)' : 'none',
                  border: filter === tab.key ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: filter === tab.key ? 'var(--text)' : 'var(--text2)',
                  fontSize: 12, fontWeight: filter === tab.key ? 600 : 400,
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredRepos.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['REPOSITORY', 'HEALTH SCORE', 'RISK TIER', 'MAIN RISK SIGNAL', 'ACTION'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text2)', fontWeight: 600, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRepos.map((repo, i) => {
                  const isCrit = repo.riskTier === 'critical'
                  const isWarn = repo.riskTier === 'warning'
                  const badgeColor = isCrit ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--green)'
                  const badgeBg = isCrit ? 'rgba(239,68,68,.12)' : isWarn ? 'rgba(245,158,11,.12)' : 'rgba(34,197,94,.12)'

                  return (
                    <tr key={repo.id || repo.name} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface2)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{repo.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{repo.orgLogin}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{repo.score}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={C.pill(badgeColor, badgeBg)}>
                          {repo.riskTier.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }}>
                        {repo.mainIssue}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <a href={repo.html_url || `https://github.com/${repo.orgLogin}/${repo.name}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiExternalLink size={12} /> GitHub
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyOk msg={`No ${filter} repositories found`} sub="All checked repositories are operating smoothly." />
        )}
      </div>
    </div>
  )
}
