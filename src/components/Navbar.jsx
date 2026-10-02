import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiHeart, FiSettings, FiZap, FiMenu, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import Logo from "../assets/og-logo.svg?react";
import { useTheme } from '../context/ThemeContext'

const LINKS = [
  { to: '/overview', label: 'Overview' },
  { to: '/repositories', label: 'Repositories' },
  { to: '/contributors', label: 'Contributors' },
  { to: '/network', label: 'Network' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/governance', label: 'Governance' },
]

export default function Navbar() {
  const { orgs, rateLimit } = useApp()
  const { theme } = useTheme();
  const navigate = useNavigate()
  const hasData = orgs.length > 0
  const lowLimit = rateLimit && rateLimit.remaining < 15
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '6px 10px',
    fontSize: 13,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--accent)' : 'var(--text2)',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'color 0.2s ease',
  })

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Main bar */}
      <div style={{
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 24, height: 56,
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <span onClick={() => { navigate('/'); setMenuOpen(false) }} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <Logo className="h-15 w-auto" />
        </span>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ gap: 2, flex: 1, overflowX: 'auto' }}>
          {hasData && LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className="navbar-link" style={navLinkStyle}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Rate limit — hidden on mobile */}
          {rateLimit && (
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 5, fontSize: 11, color: lowLimit ? 'var(--red)' : 'var(--text2)' }}>
              <FiZap size={12} />
              {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
            </div>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => navigate('/settings')}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            className='h-[-webkit-fill-available]'
          >
            <FiSettings size={13} />
            <span className="hidden md:inline">Settings</span>
          </button>
          {/* Support Us — always visible, between Settings and hamburger */}
          <button
            type="button"
            onClick={() => navigate('/support-us')}
            className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg active:scale-95"
          >
            <FiHeart size={13} fill='white' />
            <span className="hidden md:inline">Support Us</span>
          </button>
          {/* Hamburger / Menu toggle — only on mobile */}
          <button
            type="button"
            className="flex md:hidden items-center p-1 bg-transparent border-0 cursor-pointer"
            onClick={() => setMenuOpen(prev => !prev)}
            style={{ color: 'var(--text)' }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu — only on mobile */}
      {menuOpen && (
        <div style={{
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          padding: '12px 24px 16px',
          gap: 4,
        }} className="flex flex-col md:hidden">
          {hasData ? LINKS.map(({ to, label }) => (
            <NavLink
              key={to} to={to}
              className="navbar-link"
              style={({ isActive }) => ({
                padding: '10px 4px',
                fontSize: 14,
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text)',
                borderBottom: '1px solid var(--border)',
              })}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          )) : (
            <div style={{ fontSize: 13, color: 'var(--text2)', padding: '8px 4px' }}>
              Load an organisation to explore pages.
            </div>
          )}
          {/* Rate limit in mobile menu */}
          {rateLimit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: lowLimit ? 'var(--red)' : 'var(--text2)', paddingTop: 10 }}>
              <FiZap size={12} />
              API: {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()} remaining
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
