import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { maskToken } from '../lib/oauth';

const BugIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2l1.5 1.5"/><path d="M14.5 3.5L16 2"/>
    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/>
    <path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/>
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/>
    <path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
  </svg>
);

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const { token, rateLimit, apiCallCount, lastDataSource } = useApp();

  const maskedToken = token ? maskToken(token) : '—';
  const rlPct = rateLimit
    ? Math.round((rateLimit.remaining / rateLimit.limit) * 100)
    : null;

  const rlColorClass =
    rlPct === null ? '' :
    rlPct > 50 ? 'debug-val--green' :
    rlPct > 20 ? 'debug-val--orange' :
    'debug-val--red';

  return (
    <div className="debug-panel">
      {open && (
        <div className="debug-panel__content">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Debug Panel
          </div>
          <div className="debug-row">
            <span className="debug-key">Token</span>
            <span className="debug-val" style={{ fontFamily: 'monospace', fontSize: 11 }}>{maskedToken}</span>
          </div>
          <div className="debug-row">
            <span className="debug-key">Rate Limit Remaining</span>
            <span className={`debug-val ${rlColorClass}`}>
              {rateLimit ? `${rateLimit.remaining.toLocaleString()} / ${rateLimit.limit.toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-key">Rate Limit %</span>
            <span className={`debug-val ${rlColorClass}`}>
              {rlPct !== null ? `${rlPct}%` : '—'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-key">Reset At</span>
            <span className="debug-val">
              {rateLimit ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : '—'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-key">API Calls (Session)</span>
            <span className="debug-val">{apiCallCount}</span>
          </div>
          <div className="debug-row">
            <span className="debug-key">Last Data Source</span>
            <span className={`debug-val ${lastDataSource === 'cache' ? 'debug-val--green' : lastDataSource === 'api' ? '' : ''}`}>
              {lastDataSource === 'none' ? '—' : lastDataSource.toUpperCase()}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-key">Auth Status</span>
            <span className={`debug-val ${token ? 'debug-val--green' : 'debug-val--red'}`}>
              {token ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-key">API Base</span>
            <span className="debug-val" style={{ fontSize: 10 }}>api.github.com</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: 'var(--fg-subtle)', lineHeight: 1.4 }}>
            Token is memory-only (cleared on refresh).<br />
            No data sent to third-party servers.
          </div>
        </div>
      )}
      <button
        className="debug-panel__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BugIcon />
          Debug Panel
        </span>
        <span>{open ? '▼' : '▲'}</span>
      </button>
    </div>
  );
}
