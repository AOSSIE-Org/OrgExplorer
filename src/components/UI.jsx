import React from 'react'
import {
  FiChevronUp, FiChevronDown
} from 'react-icons/fi'
import { LuChevronsUpDown as FiChevronsUpDown } from 'react-icons/lu'

// Design tokens
export const C = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
  },
  label: {
    fontSize: 11,
    letterSpacing: '.08em',
    color: 'var(--text2)',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  pill: (color = 'var(--accent)', bg = 'rgba(245,197,24,.12)') => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.04em',
    color,
    background: bg,
  }),
  btn: (v = 'primary') => ({
    padding: '8px 18px',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity .15s',
    ...(v === 'primary' ? { background: 'var(--accent)', color: '#000' }
      : v === 'ghost' ? { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }
      :  v === 'danger' ? { background: 'var(--red)', color: '#fff' }
                        : { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }),
  }),
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
  },
  select: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
}

// Activity badge color map
const LC = {
  Thriving:  ['#22c55e', 'rgba(34,197,94,.15)'],
  Active:    ['#3b82f6', 'rgba(59,130,246,.15)'],
  Dormant:   ['#f59e0b', 'rgba(245,158,11,.15)'],
  Hibernating: ['#ef4444', 'rgba(239,68,68,.15)'],
  critical:  ['#ef4444', 'rgba(239,68,68,.15)'],
  high:      ['#f59e0b', 'rgba(245,158,11,.15)'],
  healthy:   ['#22c55e', 'rgba(34,197,94,.15)'],
  unknown:   ['#666',    'rgba(102,102,102,.15)'],
}

export function Badge({ text, variant }) {
  const key = variant || text
  const [color, bg] = LC[key] || LC.unknown
  return <span style={C.pill(color, bg)}>{String(text).toUpperCase()}</span>
}

export function HealthBar({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 26 }}>{score}</span>
    </div>
  )
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...C.card, textAlign: 'center' }}>
      <div style={C.label}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--accent)', margin: '6px 0 2px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
    </div>
  )
}

export function Spinner({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '3px solid var(--border)',
      borderTop: '3px solid var(--accent)',
      borderRadius: '50%',
      animation: 'spin .8s linear infinite',
    }} />
  )
}

export function SortTh({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey
  const Icon = !active ? FiChevronsUpDown : sortConfig.dir === 'desc' ? FiChevronDown : FiChevronUp
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
        userSelect: 'none', whiteSpace: 'nowrap', fontSize: 11,
        fontWeight: 600, letterSpacing: '.06em',
        background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        color: active ? 'var(--accent)' : 'var(--text2)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label} <Icon size={12} />
      </span>
    </th>
  )
}

export function PageTitle({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function LoadMore({ shown, total, onLoad }) {
  if (shown >= total) return null
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <button onClick={onLoad} style={C.btn('primary')}>Load More</button>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
        Showing {shown} of {total}
      </p>
    </div>
  )
}

export function EmptyOk({ msg, sub }) {
  return (
    <div style={{ padding: '50px 24px', textAlign: 'center' }}>
      <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: 6 }}>{msg}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
    </div>
  )
}

export function InfoBox({ children }) {
  return (
    <div style={{ ...C.card, textAlign: 'center', padding: '60px 24px', color: 'var(--text2)' }}>
      {children}
    </div>
  )
}
