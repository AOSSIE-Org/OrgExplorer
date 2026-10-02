import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { FiHeart, FiSettings, FiZap, FiMenu, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import Logo from "../assets/og-logo.svg?react";
import { useTheme } from '../context/ThemeContext'
import {
  THEME_LABEL,
  API_CALLS_REMAINING_LABEL,
  SETTINGS_LABEL,
  SUPPORT_US_LABEL,
  HAMBURGER_LABEL,
  NAV_LINKS as LINKS,
} from '../constants/navbar'

export default function Navbar() {
  const { orgs, rateLimit } = useApp()
  const { theme } = useTheme();
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const hamburgerRef = useRef(null)
  const wasOpenRef = useRef(false)
  const hasData = orgs.length > 0
  const lowLimit = rateLimit && rateLimit.remaining < 15

  const closeMenu = () => setMenuOpen(false)

  // Restore focus to hamburger button when mobile menu closes
  useEffect(() => {
    if (wasOpenRef.current && !menuOpen) {
      hamburgerRef.current?.focus()
    }
    wasOpenRef.current = menuOpen
  }, [menuOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = e => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 24, height: 56,
      justifyContent: 'space-between',
    }}>
      {/* Wordmark */}
      <span
        onClick={() => { closeMenu(); navigate('/'); }}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <Logo className="h-15 w-auto" />
      </span>

      {/* Nav links — only visible when data is loaded */}
      <div className="navbar-links" style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
        {hasData && LINKS.map(({ to, label }) => (
          <NavLink
            key={to} to={to}
            className="navbar-link"
            style={({ isActive }) => ({
              display: 'block',
              padding: '6px 10px',
              fontSize: 13,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text2)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color 0.2s ease',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side */}
      <div className="navbar-controls" style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
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
          <FiSettings size={13} /> {SETTINGS_LABEL}
        </button>
        <button
          onClick={() => navigate('/support-us')}
          className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg active:scale-95"
        >
          <FiHeart size={13} fill='white' />
          {SUPPORT_US_LABEL}
        </button>
      </div>

      {/* Hamburger button (Mobile) */}
      <button
        ref={hamburgerRef}
        className="navbar-hamburger"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label={HAMBURGER_LABEL}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav-menu"
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: 6,
          padding: '6px 8px',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div id="mobile-nav-menu" className="navbar-mobile-menu">
          {hasData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMenu}
                  className="navbar-link"
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '8px 12px',
                    fontSize: 14,
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    transition: 'all 0.2s ease',
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingTop: hasData ? 12 : 0,
            borderTop: hasData ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{THEME_LABEL}</span>
              <ThemeToggle onToggle={closeMenu} />
            </div>

            {rateLimit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: lowLimit ? 'var(--red)' : 'var(--text2)' }}>
                <FiZap size={13} />
                {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()} {API_CALLS_REMAINING_LABEL}
              </div>
            )}

            <button
              onClick={() => { closeMenu(); navigate('/settings'); }}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
              }}
            >
              <FiSettings size={14} /> {SETTINGS_LABEL}
            </button>

            <button
              onClick={() => { closeMenu(); navigate('/support-us'); }}
              className="flex items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg active:scale-95 w-full"
            >
              <FiHeart size={14} fill='white' />
              {SUPPORT_US_LABEL}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop overlay */}
      {menuOpen && (
        <div
          data-testid="navbar-backdrop"
          onClick={closeMenu}
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 98,
          }}
        />
      )}
    </nav>
  )
}


