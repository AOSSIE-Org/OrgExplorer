import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiBarChart2, FiBook, FiChevronRight, FiExternalLink, FiHeart, FiHome, FiMenu, FiSettings, FiShare2, FiShield, FiSun, FiUsers, FiZap, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import ThemeToggle from './ThemeToggle'
import Logo from "../assests/og-logo.svg?react";

const LINKS = [
  { to: '/overview', label: 'Overview', icon: FiHome },
  { to: '/repositories', label: 'Repositories', icon: FiBook },
  { to: '/contributors', label: 'Contributors', icon: FiUsers },
  { to: '/network', label: 'Network', icon: FiShare2 },
  { to: '/analytics', label: 'Analytics', icon: FiBarChart2 },
  { to: '/governance', label: 'Governance', icon: FiShield },
]

export default function Navbar() {
  const { rateLimit } = useApp()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const navbarRef = useRef(null)
  const linksRef = useRef(null)
  const menuToggleRef = useRef(null)
  const lowLimit = rateLimit && rateLimit.remaining < 15

  useEffect(() => {
    const navbar = navbarRef.current
    const links = linksRef.current
    const menuToggle = menuToggleRef.current
    if (!navbar || !links || !menuToggle) return

    const measureOverflow = () => {
      const wasOverflowing = links.classList.contains('navbar-links-overflowing')
      links.classList.remove('navbar-links-overflowing')
      menuToggle.classList.remove('navbar-menu-toggle-visible')
      const nextOverflowing = links.scrollWidth > links.clientWidth
      if (wasOverflowing) {
        links.classList.add('navbar-links-overflowing')
        menuToggle.classList.add('navbar-menu-toggle-visible')
      }
      setIsOverflowing(current => current === nextOverflowing ? current : nextOverflowing)
    }

    const observer = new ResizeObserver(measureOverflow)
    observer.observe(navbar)
    observer.observe(links)
    measureOverflow()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isOverflowing) setMobileMenuOpen(false)
  }, [isOverflowing])

  return (
    <nav ref={navbarRef} className={`app-navbar${mobileMenuOpen ? ' app-navbar-menu-open' : ''}`} style={{
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
        onClick={() => navigate('/')}
      >
        <Logo className="h-15 w-auto" />
      </span>

      {/* Nav links — only visible when data is loaded */}
      <div ref={linksRef} className={`navbar-links${isOverflowing ? ' navbar-links-overflowing' : ''}`} style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
        {LINKS.map(({ to, label }) => (
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
          <div className="navbar-rate-limit" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: lowLimit ? 'var(--red)' : 'var(--text2)' }}>
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
        <button
          onClick={() => navigate('/support-us')}
          className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg active:scale-95"
        >
          <FiHeart size={13} fill='white' />
          Support Us
        </button>
      </div>

      <button
        type="button"
        ref={menuToggleRef}
        className={`navbar-menu-toggle${isOverflowing ? ' navbar-menu-toggle-visible' : ''}`}
        aria-label="Toggle navigation"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMobileMenuOpen(open => !open)}
      >
        <FiMenu className="navbar-menu-icon" size={19} />
        <FiX className="navbar-close-icon" size={19} />
      </button>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="mobile-nav-menu mobile-nav-menu-visible">
          <div className="mobile-nav-header">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FiX size={19} />
            </button>
          </div>
          <div className="mobile-nav-heading">Main navigation</div>
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="navbar-link mobile-nav-row"
              onClick={() => setMobileMenuOpen(false)}
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                background: isActive ? 'rgba(245,197,24,.1)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              })}
            >
              <Icon size={16} />
              <span>{label}</span>
              <FiChevronRight className="mobile-nav-arrow" size={15} />
            </NavLink>
          ))}
          <div className="mobile-nav-divider" />
          <div className="mobile-nav-heading">Other controls</div>
          <button className="mobile-nav-row" onClick={() => { navigate('/settings'); setMobileMenuOpen(false) }}>
            <FiSettings size={16} />
            <span>Settings</span>
            <FiChevronRight className="mobile-nav-arrow" size={15} />
          </button>
          <div className="mobile-nav-row">
            <FiSun size={16} />
            <span>Theme</span>
            <span className="mobile-nav-theme-toggle"><ThemeToggle /></span>
          </div>
          <button className="mobile-nav-row" onClick={() => { navigate('/support-us'); setMobileMenuOpen(false) }}>
            <FiHeart size={16} />
            <span>Support Us</span>
            <FiExternalLink className="mobile-nav-arrow" size={15} />
          </button>
        </div>
      )}
    </nav>
  )
}
