import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiHome } from 'react-icons/fi'
import { C } from '../components/UI'

export default function NotFoundPage() {
  const { key } = useLocation()
  const navigate = useNavigate()

  // React Router gives the first location of a session the key "default".
  // Any other key means the user arrived via in-app history, so "Go back"
  // has an OrgExplorer page to return to.
  const canGoBack = key !== 'default'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '64px 20px',
        minHeight: '70vh',
      }}
    >
      <h1
        aria-label="404"
        style={{
          color: 'var(--accent)',
          fontSize: 'clamp(4rem, 14vw, 7rem)',
          fontWeight: 800,
          lineHeight: 1,
          margin: 0,
        }}
      >
        404
      </h1>

      <h2
        style={{
          color: 'var(--text)',
          fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
          fontWeight: 700,
          margin: '12px 0 8px',
        }}
      >
        Page not found
      </h2>

      <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, maxWidth: 380, margin: 0 }}>
        The page you are looking for does not exist or may have been moved.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
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
    </div>
  )
}
