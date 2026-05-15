import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { clearAllCache } from '../../lib/cache';
import type { OrgData } from '../../types';

interface SidebarProps {
  org: OrgData | null;
}

// Simple SVG icons
const Icons = {
  Logo: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  ),
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Security: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Globe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
      <path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Sidebar({ org }: SidebarProps) {
  const { setToken } = useApp();
  const location = useLocation();

  const handleLogout = () => {
    setToken(null);
  };

  const handleClearCache = async () => {
    await clearAllCache();
    alert('Cache cleared successfully.');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { path: '/security', label: 'Security & Privacy', icon: <Icons.Security /> },
  ];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <span className="sidebar__logo-icon"><Icons.Logo /></span>
        <span className="sidebar__logo-text">Org Explorer</span>
      </div>

      {/* Org card */}
      {org && (
        <div className="sidebar__org-card">
          <img
            src={org.avatar_url}
            alt={org.login}
            className="sidebar__org-avatar"
          />
          <div className="sidebar__org-name">{org.name ?? org.login}</div>
          {org.description && (
            <div className="sidebar__org-desc">{org.description}</div>
          )}
          <div className="sidebar__org-meta">
            {org.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <Icons.Globe />
                <span>{org.location}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icons.Calendar />
              <span>Since {new Date(org.created_at).getFullYear()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="sidebar__nav">
        <div className="sidebar__nav-section">Navigation</div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar__nav-item${location.pathname === item.path ? ' active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Footer actions */}
      <div className="sidebar__footer">
        <button
          className="btn btn--secondary"
          style={{ width: '100%', marginBottom: 8, justifyContent: 'flex-start', fontSize: 12 }}
          onClick={handleClearCache}
        >
          <Icons.Trash />
          Clear Cache
        </button>
        <button
          className="btn btn--danger"
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12 }}
          onClick={handleLogout}
        >
          <Icons.Logout />
          Logout
        </button>
      </div>
    </nav>
  );
}
