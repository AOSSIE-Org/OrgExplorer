import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiShield } from 'react-icons/fi'
import { C, PageTitle } from '../components/UI'

export default function PrivacyPage() {
  return (
    <div style={{ padding: '32px 24px', maxWidth: 860, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/"
          style={{
            ...C.btn('primary'),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          <FiArrowLeft size={14} /> Back to Home
        </Link>
      </div>

      <PageTitle
        title="Privacy Policy"
        subtitle="How OrgExplorer handles your data and privacy"
      />

      <div style={{ ...C.card, display: 'flex', flexDirection: 'column', gap: 24, lineHeight: 1.7 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FiShield size={18} color="var(--green)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>1. Zero Server-Side Storage</h2>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            OrgExplorer is a 100% client-side application. There is no backend server, tracking database, or third-party analytics telemetry. All data processing occurs locally within your browser.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>2. Personal Access Tokens (PAT)</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            When you enter a GitHub Personal Access Token in Settings:
          </p>
          <ul style={{ marginLeft: 20, color: 'var(--text2)', fontSize: 13, marginTop: 6 }}>
            <li>It is saved solely in your browser's <code>localStorage</code>.</li>
            <li>It is sent directly to <code>https://api.github.com</code> in the <code>Authorization</code> header for authenticated GitHub requests.</li>
            <li>It is never transmitted to any other server, proxy, or logging service.</li>
            <li>You can clear or remove it at any time from the Settings page.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>3. Local Caching (IndexedDB & LocalStorage)</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            To optimize performance and reduce GitHub API rate limit consumption, query responses are cached locally on your device in <code>IndexedDB</code> (with a 1-hour expiration) and recent searches are kept in <code>localStorage</code>. You can clear this cache anytime in Settings.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>4. Third-Party Services</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            OrgExplorer connects to GitHub's public API to retrieve repository, issue, and contributor data. GitHub's privacy practices are governed by <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHub Privacy Statement</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
