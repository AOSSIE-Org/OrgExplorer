import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initiateOAuth } from "../lib/oauth";
import { useApp } from "../context/AppContext";

const GitHubIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const features = [
  { icon: '📊', title: 'Activity Analytics',  desc: 'Track commits, pull requests and issues across all repositories with interactive charts.' },
  { icon: '👥', title: 'Contributor Insights', desc: 'Identify top contributors, track engagement patterns, and understand community growth.' },
  { icon: '📁', title: 'Repository Overview',  desc: 'See every repo at once — stars, forks, languages, health status — sortable and filterable.' },
  { icon: '⚡', title: 'Smart Local Caching',  desc: 'IndexedDB caching keeps you within GitHub API rate limits and loads data instantly.' },
  { icon: '🔒', title: 'Privacy First',         desc: 'No backend, no telemetry. OAuth 2.0 PKCE — your token never leaves the browser.' },
  { icon: '📈', title: 'Trend Analysis',        desc: 'Spot emerging projects and growth patterns with monthly trend visualisations.' },
];

const stats = [
  { value: '247+',  label: 'Repos tracked' },
  { value: '12.4K', label: 'Stars indexed' },
  { value: '184',   label: 'Contributors'  },
  { value: '5K/hr', label: 'API calls'     },
];

const clientIdMissing = !import.meta.env.VITE_GITHUB_CLIENT_ID;

export default function LandingPage() {
  const { token } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (token) { navigate('/dashboard'); return; }
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
    <div className="landing">

      <nav className="landing__nav">
        <div className="landing__nav-inner">
          <div className="landing__logo"><GitHubIcon size={20} /><span>Organization Explorer</span></div>
          <button className="landing__nav-btn" onClick={handleLogin} disabled={loading || clientIdMissing}>
            <GitHubIcon size={15} />{loading ? 'Redirecting…' : 'Sign in with GitHub'}
          </button>
        </div>
      </nav>

      <section className="landing__hero">
        <div className="landing__hero-glow landing__hero-glow--left" />
        <div className="landing__hero-glow landing__hero-glow--right" />
        <div className="landing__hero-inner">
          <div className="landing__badge">
            <span className="landing__badge-dot" />
            Lightweight · Cloud-free · Privacy-first
          </div>
          <h1 className="landing__heading">
            Understand Your GitHub Org{' '}
            <span className="landing__heading-accent">at a Glance</span>
          </h1>
          <p className="landing__subheading">
            As organisations grow with hundreds of repos and contributors, GitHub's native UI
            becomes insufficient. Organisation Explorer provides comprehensive analytics with
            zero backend and full privacy.
          </p>
          {clientIdMissing && (
            <div className="landing__env-warning">
              ⚠️ <strong>Setup required:</strong> Add{' '}
              <code>VITE_GITHUB_CLIENT_ID</code> to <code>.env.local</code> and restart.
            </div>
          )}
          {error && <div className="landing__error">✗ {error}</div>}
          <div className="landing__cta-row">
            <button className="landing__cta-primary" onClick={handleLogin} disabled={loading || clientIdMissing}>
              <GitHubIcon size={18} />{loading ? 'Redirecting to GitHub…' : "Get Started — it's free"}
            </button>
            <a className="landing__cta-secondary" href="https://github.com" target="_blank" rel="noopener noreferrer">
              Learn more ↗
            </a>
          </div>
          <div className="landing__stats">
            {stats.map((s) => (
              <div key={s.label} className="landing__stat">
                <span className="landing__stat-value">{s.value}</span>
                <span className="landing__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__features">
        <div className="landing__section-inner">
          <h2 className="landing__section-title">Everything you need to explore any org</h2>
          <p className="landing__section-sub">
            A complete analytics dashboard — no installs, no servers, just sign in and go.
          </p>
          <div className="landing__feature-grid">
            {features.map((f) => (
              <div key={f.title} className="landing__feature-card">
                <span className="landing__feature-icon">{f.icon}</span>
                <h3 className="landing__feature-title">{f.title}</h3>
                <p className="landing__feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__banner">
        <div className="landing__banner-inner">
          <h2 className="landing__banner-title">Ready to explore your organization?</h2>
          <p className="landing__banner-sub">
            Sign in with GitHub OAuth and get instant access to rich metrics across every
            repo — no setup, no backend, no cost.
          </p>
          <button className="landing__cta-primary" onClick={handleLogin} disabled={loading || clientIdMissing}>
            <GitHubIcon size={18} />{loading ? 'Redirecting…' : 'Sign in with GitHub'}
          </button>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__logo"><GitHubIcon size={16} /><span>Organization Explorer</span></div>
        <span>Powered by GitHub API · OAuth 2.0 PKCE · No backend required</span>
        <span>Data is stored locally in your browser only</span>
      </footer>

    </div>
  );
}
