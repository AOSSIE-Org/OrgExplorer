import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHome } from 'react-icons/fi'
import { C } from '../components/UI'

export default function NotFoundPage() {
  const { pathname, key } = useLocation()
  const navigate = useNavigate()

  // React Router gives the first location of a session the key "default".
  // Any other key means the user reached this page through in-app history,
  // so "Go back" has an OrgExplorer page to return to.
  const canGoBack = key !== 'default'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '64px 20px',
        minHeight: '60vh',
      }}
    >
      <section
        aria-labelledby="not-found-title"
        style={{
          ...C.card,
          width: '100%',
          maxWidth: 560,
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <p style={{ ...C.label, color: 'var(--accent)', marginBottom: 12 }}>Error 404</p>

        <h1
          id="not-found-title"
          style={{
            color: 'var(--text)',
            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Page not found
        </h1>

        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          We couldn't find a page at
        </p>
        <code
          data-testid="not-found-path"
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 13,
            color: 'var(--text)',
          }}
        >
          {pathname}
        </code>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginTop: 8 }}>
          The link may be mistyped or outdated.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 28,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FiHome size={14} aria-hidden="true" /> Go to Home
          </button>
          {canGoBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ ...C.btn('ghost'), display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FiArrowLeft size={14} aria-hidden="true" /> Go back
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
