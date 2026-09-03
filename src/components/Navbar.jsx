import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiHeart, FiSettings, FiZap, FiMenu, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import Logo from "../assests/og-logo.svg?react"
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
  const { theme } = useTheme()
  const navigate = useNavigate()

  const hasData = orgs.length > 0
  const lowLimit = rateLimit && rateLimit.remaining < 15
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile navigation menu */}
      {menuOpen && hasData && (
        <div className="navbar-mobile-menu">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className="navbar-mobile-link"
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: '10px 12px',
                textDecoration: 'none',
                color: isActive ? 'var(--accent)' : 'var(--text)',
                fontWeight: isActive ? 600 : 400,
                borderRadius: 6,
                background: isActive ? 'var(--surface)' : 'transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: 56,
          justifyContent: 'space-between',
        }}
      >
        {/* Wordmark */}
        <NavLink
          to="/"
          aria-label="Go to home"
          style={{ cursor: 'pointer', flexShrink: 0 }}
        >
          <Logo className="h-15 w-auto" />
        </NavLink>

        {/* Desktop Nav links */}
        <div className="navbar-desktop-links">
          {hasData &&
            LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className="navbar-link"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '6px 10px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  borderBottom: isActive
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  transition: 'color 0.2s ease',
                })}
              >
                {label}
              </NavLink>
            ))}
        </div>

        {/* Right side */}
        <div className="navbar-right">
          {rateLimit && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: lowLimit ? 'var(--red)' : 'var(--text2)',
              }}
            >
              <FiZap size={12} />
              {rateLimit.remaining.toLocaleString()} /{' '}
              {rateLimit.limit.toLocaleString()}
            </div>
          )}

          <ThemeToggle />

          <button
            onClick={() => navigate('/settings')}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <FiSettings size={13} />
            Settings
          </button>

          <button
            onClick={() => navigate('/support-us')}
            className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg active:scale-95"
          >
            <FiHeart size={13} fill="white" />
            Support Us
          </button>
        </div>

        {/* Mobile menu button */}
        {hasData && (
          <button
            className="navbar-menu-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={
              menuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        )}
      </nav>
    </>
  )
}