import { useState } from 'react';
import { initiateOAuth } from '../lib/oauth';

const GitHubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="login-card__feature-icon">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const clientIdMissing = !import.meta.env.VITE_GITHUB_CLIENT_ID;

const features = [
  'OAuth 2.0 with PKCE – no client secret required',
  'Token stored in memory only (cleared on refresh)',
  'IndexedDB caching (12h org / 6h repos)',
  'Direct calls to api.github.com – no proxy for data',
  '5,000 requests/hour when authenticated',
  'Real-time rate limit monitoring',
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await initiateOAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__icon">
          <GitHubIcon />
        </div>
        <h1 className="login-card__title">GitHub Org Explorer</h1>
        <p className="login-card__subtitle">
          A frontend-only prototype to explore GitHub organizations,
          test OAuth 2.0 PKCE authentication, and observe API rate limits.
        </p>

        {clientIdMissing && (
          <div className="login-card__env-warning">
            ⚠️ <strong>Setup required:</strong> Create a <code>.env.local</code> file with{' '}
            <code>VITE_GITHUB_CLIENT_ID=your_client_id</code><br />
            See <code>.env.example</code> for all variables.
          </div>
        )}

        {error && (
          <div className="alert alert--error" style={{ marginBottom: 16, textAlign: 'left' }}>
            <span>✗</span>
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn btn--primary btn--lg btn--full"
          onClick={handleLogin}
          disabled={loading || clientIdMissing}
          style={{ marginBottom: 24 }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16 }} />
              Redirecting to GitHub…
            </>
          ) : (
            <>
              <GitHubIcon />
              Login with GitHub
            </>
          )}
        </button>

        <ul className="login-card__features">
          {features.map((f) => (
            <li key={f} className="login-card__feature">
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>

        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>
          Required scopes: <code>read:org</code>, <code>public_repo</code>
        </div>
      </div>
    </div>
  );
}
