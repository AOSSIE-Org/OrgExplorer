import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C, Spinner } from '../components/UI'

const QUICK = ['AOSSIE-Org', 'DjedAlliance', 'StabilityNexus']

export default function HomePage() {
  const { explore, loading, loadMsg, exploreError } = useApp()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [chips, setChips] = useState([])

  const recent = JSON.parse(localStorage.getItem('oe_recent') || '[]')

  const addChip = raw => {
    const parts = raw.split(/[,+\s]+/).map(s => s.trim()).filter(Boolean)
    setChips(prev => [...new Set([...prev, ...parts])])
    setInput('')
  }

  const removeChip = c => setChips(prev => prev.filter(x => x !== c))

  const handleKey = e => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addChip(input)
    }
    if (e.key === 'Backspace' && !input && chips.length) {
      setChips(prev => prev.slice(0, -1))
    }
  }

  const go = async (targets) => {
    const orgs = targets || (chips.length ? chips : input.trim() ? [input.trim()] : [])
    if (!orgs.length) return
    const success = await explore(orgs)
    if(success) navigate('/overview')
  }

  return (
    <div style={{
      minHeight: '90vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 32,
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 580 }}>
        <h1 style={{ fontSize: 'clamp(30px,6vw,58px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
          Architect Your{' '}
          <span style={{ color: 'var(--accent)' }}>Insights</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7 }}>
          Unified analytics across one or many GitHub organizations. Multi-org portfolio analysis, contributor network graphs, time-series trends, and governance audits — entirely in the browser.
        </p>
      </div>

      {/* Search */}
      <div style={{ width: '100%', maxWidth: 680 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '6px 8px',
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 54,
        }}>
          <FiSearch size={16} color="var(--text2)" style={{ marginLeft: 4, flexShrink: 0 }} />
          {chips.map(c => (
            <span key={c} style={{
              background: 'rgba(245,197,24,.1)', border: '1px solid rgba(245,197,24,.3)',
              color: 'var(--accent)', borderRadius: 4, padding: '3px 8px',
              fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {c}
              <FiX size={12} style={{ cursor: 'pointer', opacity: .7 }} onClick={() => removeChip(c)} />
            </span>
          ))}
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => input.trim() && addChip(input)}
            placeholder={chips.length ? 'Add another org...' : 'AOSSIE-Org, StabilityNexus, DjedAlliance...'}
            style={{ flex: 1, minWidth: 160, background: 'none', color: 'var(--text)', fontSize: 14, padding: '4px 8px', border: 'none', outline: 'none' }}
          />
          <button onClick={() => go()} style={{ ...C.btn('primary'), padding: '8px 22px', flexShrink: 0 }}>
            EXPLORE
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, paddingLeft: 4 }}>
          Type an org name and press Enter or comma to add. Add multiple orgs to analyze as a unified portfolio.
        </p>
        {exploreError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{exploreError}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{loadMsg}</p>
        </div>
      )}
  
      {/* Recent */}
      {recent.length > 0 && !loading && (
        <div style={{ textAlign: 'center' }}>
          <span style={{ ...C.label, display: 'block', marginBottom: 8 }}>Recent searches</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {recent.map(r => (
              <button key={r} onClick={() => go(r.split(',').map(s => s.trim()))} style={{ ...C.btn('ghost'), fontSize: 12, padding: '4px 12px' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick explore */}
      {!loading && (
        <div style={{ textAlign: 'center' }}>
          <span style={{ ...C.label, display: 'block', marginBottom: 8 }}>Quick explore</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => go([q])} style={{ ...C.btn('secondary'), fontSize: 12, padding: '5px 14px' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 48, padding: '20px 40px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        {[['5,000', 'req/hr with PAT', 'var(--green)'], ['1HR', 'intelligent cache', 'var(--green)'], ['ZERO', 'backend latency', 'var(--accent)']].map(([v, l, color]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: '.07em', textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
