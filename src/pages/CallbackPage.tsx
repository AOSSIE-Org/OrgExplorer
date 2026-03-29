import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../lib/oauth';
import { useApp } from '../context/AppContext';
import { fetchRateLimit } from '../lib/github';

type Status = 'loading' | 'success' | 'error';

export default function CallbackPage() {
  const navigate = useNavigate();
  const { setToken, setRateLimit, incrementApiCallCount } = useApp();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Exchanging authorization code…');
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDesc = params.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDesc ?? error);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing code or state parameter in callback URL.');
        return;
      }

      try {
        setMessage('Exchanging code for access token…');
        const token = await exchangeCodeForToken(code, state);
        setToken(token);

        // Immediately fetch initial rate limit
        setMessage('Fetching rate limit…');
        const rl = await fetchRateLimit(token, incrementApiCallCount);
        setRateLimit(rl);

        setStatus('success');
        setMessage('Authentication successful! Redirecting…');

        // Clean the URL (remove code & state from history)
        window.history.replaceState({}, document.title, '/callback');

        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    void handleCallback();
  }, [navigate, setToken, setRateLimit, incrementApiCallCount]);

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 400 }}>
        {status === 'loading' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
            <h2 style={{ color: 'var(--fg-default)', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
              Authenticating
            </h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ color: 'var(--success-fg)', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
              Authenticated!
            </h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✗</div>
            <h2 style={{ color: 'var(--danger-fg)', marginBottom: 12, fontSize: 18, fontWeight: 600 }}>
              Authentication Failed
            </h2>
            <div className="alert alert--error" style={{ textAlign: 'left' }}>
              {message}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20, textAlign: 'left', lineHeight: 1.6 }}>
              <strong>Common causes:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                <li>CORS proxy not reachable (try refreshing)</li>
                <li>GitHub OAuth App not configured for PKCE</li>
                <li>Redirect URI mismatch in GitHub App settings</li>
                <li><code>VITE_GITHUB_CLIENT_ID</code> not set correctly</li>
              </ul>
            </div>
            <button
              className="btn btn--secondary btn--full"
              onClick={() => navigate('/', { replace: true })}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
