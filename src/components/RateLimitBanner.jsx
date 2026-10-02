import React from 'react'
import { Link } from 'react-router-dom'
import { FiZap, FiAlertTriangle } from 'react-icons/fi'
import { useApp } from '../context/AppContext'

export default function RateLimitBanner() {
  const { rateLimit, pat } = useApp()
  if (!rateLimit) return null

  const pct = rateLimit.remaining / rateLimit.limit
  if (pct > 0.2 && rateLimit.limit > 60) return null

  const crit = pct < 0.1
  const Icon = crit ? FiAlertTriangle : FiZap

  return (
    <div style={{
      borderLeft: `3px solid ${crit ? 'var(--red)' : 'var(--accent)'}`,
      background: crit ? 'rgba(239,68,68,.07)' : 'rgba(245,197,24,.06)',
      padding: '9px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px 16px',
    }}>
      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        <Icon size={13} color={crit ? 'var(--red)' : 'var(--accent)'} style={{ flexShrink: 0 }} />
        API RATE LIMIT: <strong style={{ marginLeft: 2 }}>{rateLimit.remaining} / {rateLimit.limit}</strong> REQUESTS REMAINING
        {!pat && (
          <Link
            to="/settings"
            style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            Add PAT for 5,000 req/hr
          </Link>
        )}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text2)' }}>
        Used: {rateLimit.used} • Reset at{' '}
        {new Date(rateLimit.reset * 1000).toLocaleTimeString()}
      </span>
    </div>
  )
}
