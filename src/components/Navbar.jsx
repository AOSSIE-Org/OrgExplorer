import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiSettings, FiZap } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import ogLogoWhite from "../assests/og-logo.png";
import ogLogoDark from "../assests/og-logo-dark.png";
import { useTheme } from '../context/ThemeContext'

const LINKS = [
  { to: '/overview',     label: 'Overview'     },
  { to: '/repositories', label: 'Repositories' },
  { to: '/contributors', label: 'Contributors' },
  { to: '/network',      label: 'Network'      },
  { to: '/analytics',    label: 'Analytics'    },
  { to: '/governance',   label: 'Governance'   },
]

export default function Navbar() {
  const { orgs, rateLimit } = useApp()
  const { theme } = useTheme();
  const navigate = useNavigate()
  const hasData  = orgs.length > 0
  const lowLimit = rateLimit && rateLimit.remaining < 15

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 24, height: 56,
    }}>
      {/* Wordmark */}
      <span
        onClick={() => navigate('/')}
      >
        {
          theme === "dark" &&
          <img src={ogLogoDark} alt="Logo" className='h-15' />
        }
        {
          theme === "light" &&
          <img src={ogLogoWhite} alt="Logo" className='h-15' />
        }
      </span>

      {/* Nav links — only visible when data is loaded */}
      <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
        {hasData && LINKS.map(({ to, label }) => (
          <NavLink
            key={to} to={to}
            style={({ isActive }) => ({
              display: 'block', padding: '6px 10px',
              fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {rateLimit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: lowLimit ? 'var(--red)' : 'var(--text2)' }}>
            <FiZap size={12} />
            {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
          </div>
        )}
        <ThemeToggle />
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          className='h-[-webkit-fill-available]'
        >
          <FiSettings size={13} /> Settings
        </button>
      </div>
    </nav>
  )
}
