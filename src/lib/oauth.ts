/**
 * GitHub OAuth 2.0 Authorization Code Flow with PKCE
 * Frontend-only implementation (no client_secret needed with PKCE)
 * 
 * Note: GitHub added PKCE support for OAuth Apps. The token exchange
 * endpoint (github.com/login/oauth/access_token) requires a CORS proxy
 * since GitHub does not set CORS headers on that endpoint for browser requests.
 * Configure VITE_TOKEN_PROXY_URL to point to your proxy (or use corsproxy.io by default).
 */

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID ?? '';
const CLIENT_SECRET = import.meta.env.VITE_GITHUB_CLIENT_SECRET ?? '';
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI ?? 'http://localhost:5173/callback';
const SCOPES = 'read:org public_repo';

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function base64URLEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = crypto.getRandomValues(new Uint8Array(48));
  const verifier = base64URLEncode(array);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64URLEncode(digest);
  return { verifier, challenge };
}

export function generateState(): string {
  return base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

export async function initiateOAuth(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not set. Create a .env.local file.');
  }

  const { verifier, challenge } = await generatePKCE();
  const state = generateState();

  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    response_type: 'code',
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  state: string,
): Promise<string> {
  const savedState = sessionStorage.getItem('oauth_state');
  const verifier = sessionStorage.getItem('pkce_verifier');

  if (!savedState || state !== savedState) {
    throw new Error('OAuth state mismatch – possible CSRF attack. Please try logging in again.');
  }

  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('pkce_verifier');

  // GitHub's token endpoint does not send CORS headers for browser requests.
  // A CORS proxy is needed for this one-time token exchange call.
  // All subsequent GitHub *data* API calls go directly to api.github.com.
  // Cloudflare Worker proxy handles CORS for the token exchange.
  // Override by setting VITE_TOKEN_PROXY_URL environment variable.
  const proxyBase =
    import.meta.env.VITE_TOKEN_PROXY_URL ??
    'https://prt-org-exp.protham-dey.workers.dev/';

  const response = await fetch(proxyBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Record<string, string>;

  if (data['error']) {
    throw new Error(data['error_description'] ?? data['error']);
  }

  const token = data['access_token'];
  if (!token) {
    throw new Error('No access token in response');
  }

  return token;
}

export function maskToken(token: string): string {
  if (token.length < 10) return '****';
  return `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}`;
}
