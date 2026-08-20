import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiFileText } from 'react-icons/fi'
import { C, PageTitle } from '../components/UI'

export default function TermsPage() {
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
        title="Terms of Service"
        subtitle="Open source platform terms and usage guidelines"
      />

      <div style={{ ...C.card, display: 'flex', flexDirection: 'column', gap: 24, lineHeight: 1.7 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FiFileText size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>1. Open Source License & Usage</h2>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            OrgExplorer is an open-source project maintained by <a href="https://aossie.org" target="_blank" rel="noreferrer">AOSSIE</a> under the MIT License. You are free to use, modify, and distribute it in accordance with the terms of the MIT license.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>2. GitHub API Compliance</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            OrgExplorer interacts directly with the public GitHub REST API from your browser. By using OrgExplorer, you agree to comply with <a href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service" target="_blank" rel="noreferrer">GitHub's Terms of Service</a> and adhere to GitHub API rate limits and acceptable use policies.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>3. Personal Access Tokens (PAT)</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            If you provide a GitHub Personal Access Token (PAT), it is stored exclusively in your browser's local storage and used solely to authenticate your client-side requests to the GitHub API. OrgExplorer does not transmit, store, or log your credentials on any external server.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>4. Disclaimer of Warranty</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            OrgExplorer is provided "AS IS", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability.
          </p>
        </div>
      </div>
    </div>
  )
}
