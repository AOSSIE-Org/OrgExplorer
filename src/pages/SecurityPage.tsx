import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clearAllCache, getCacheStats } from '../lib/cache';
import { maskToken } from '../lib/oauth';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import DebugPanel from '../components/DebugPanel';

interface CacheStats { count: number; keys: string[] }

// Icons
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-fg)" strokeWidth="2.5">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ServerOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
    <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const securityPoints = [
  { icon: <ServerOffIcon />, text: 'No backend server used. This app runs entirely in your browser.' },
  { icon: <CheckIcon />, text: 'All GitHub API calls go directly to api.github.com from your browser.' },
  { icon: <LockIcon />, text: 'Access token is stored in React state (memory) only. It is cleared on page refresh or logout.' },
  { icon: <DatabaseIcon />, text: 'Repository and organization data is cached locally in IndexedDB – it never leaves your device.' },
  { icon: <EyeOffIcon />, text: 'No analytics, no telemetry, no data is transmitted to any third-party server.' },
  { icon: <CheckIcon />, text: 'OAuth 2.0 Authorization Code flow with PKCE – no client_secret stored in code.' },
  { icon: <CheckIcon />, text: 'CSRF protection via state parameter validation during OAuth callback.' },
  { icon: <LockIcon />, text: 'All requests use HTTPS. The Authorization header is sent only to api.github.com.' },
];

export default function SecurityPage() {
  const { token, setToken, rateLimit } = useApp();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [cleared, setCleared] = useState(false);
  const [tokenCleared, setTokenCleared] = useState(false);

  useEffect(() => {
    void getCacheStats().then(setCacheStats);
  }, []);

  const handleClearCache = async () => {
    await clearAllCache();
    const stats = await getCacheStats();
    setCacheStats(stats);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const handleClearToken = () => {
    setToken(null);
    setTokenCleared(true);
  };

  return (
    <div className="app-shell">
      <Sidebar org={null} />

      <div className="main-content">
        <div className="page-content">
          <div className="security-page">
            <h1 className="page-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldIcon />
                Security &amp; Privacy
              </span>
              <span className="page-subtitle">
                How this app handles your data and authentication
              </span>
            </h1>

            {/* Architecture */}
            <div className="security-section">
              <h2 className="security-section__title">
                <ShieldIcon />
                Security Architecture
              </h2>
              {securityPoints.map((item, i) => (
                <div key={i} className="security-item">
                  <span className="security-item__icon">{item.icon}</span>
                  <span className="security-item__text">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Token info */}
            <div className="security-section">
              <h2 className="security-section__title">
                <LockIcon />
                Access Token
              </h2>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                  Current token (masked):
                </div>
                <code style={{
                  display: 'block',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 12px',
                  fontSize: 13,
                  color: token ? 'var(--accent-fg)' : 'var(--fg-muted)',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}>
                  {token ? maskToken(token) : '— not authenticated —'}
                </code>
              </div>
              {token && !tokenCleared && (
                <button className="btn btn--danger" onClick={handleClearToken}>
                  Clear Access Token &amp; Logout
                </button>
              )}
              {tokenCleared && (
                <div className="alert alert--success">
                  Token cleared. You have been logged out.{' '}
                  <Link to="/">Log in again →</Link>
                </div>
              )}
            </div>

            {/* Rate limit */}
            {rateLimit && (
              <div className="security-section">
                <h2 className="security-section__title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                  </svg>
                  Current Rate Limit
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Limit', value: rateLimit.limit.toLocaleString() },
                    { label: 'Remaining', value: rateLimit.remaining.toLocaleString() },
                    { label: 'Used', value: rateLimit.used.toLocaleString() },
                    { label: 'Resets At', value: new Date(rateLimit.reset * 1000).toLocaleTimeString() },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius)',
                      padding: '12px 16px',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-default)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cache management */}
            <div className="security-section">
              <h2 className="security-section__title">
                <DatabaseIcon />
                Local Cache (IndexedDB)
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Organization metadata is cached for <strong>12 hours</strong> and repository lists
                for <strong>6 hours</strong>. Cached data is stored in your browser's IndexedDB
                and is never transmitted anywhere.
              </p>

              {cacheStats && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
                    Cached entries: <strong style={{ color: 'var(--fg-default)' }}>{cacheStats.count}</strong>
                  </div>
                  {cacheStats.keys.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cacheStats.keys.map((k) => (
                        <span key={k} className="badge badge--gray">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn--secondary" onClick={handleClearCache}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
                </svg>
                Clear All Cache
              </button>

              {cleared && (
                <div className="alert alert--success" style={{ marginTop: 12 }}>
                  Cache cleared successfully.
                </div>
              )}
            </div>

            {/* OAuth flow explanation */}
            <div className="security-section">
              <h2 className="security-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                OAuth PKCE Flow
              </h2>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.8 }}>
                <ol style={{ paddingLeft: 20 }}>
                  <li>A cryptographically random <strong>code_verifier</strong> is generated in-browser.</li>
                  <li>A SHA-256 <strong>code_challenge</strong> is derived and sent to GitHub.</li>
                  <li>GitHub redirects back with an authorization <strong>code</strong>.</li>
                  <li>The code + code_verifier are exchanged for an <strong>access token</strong>.</li>
                  <li>The token is held in React state only – never written to localStorage or cookies.</li>
                </ol>
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-subtle)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                  <strong>Note:</strong> GitHub's token endpoint does not set CORS headers for browser
                  requests. A minimal CORS proxy handles the token exchange step. All subsequent
                  GitHub API data requests go <em>directly</em> to api.github.com.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <DebugPanel />
    </div>
  );
}
