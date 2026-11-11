import React from 'react'

export default function AuditFailureNotice({ failedRepos }) {
  if (!failedRepos?.length) return null

  return (
    <div role="alert" style={{ marginBottom: 20, padding: '12px 16px', border: '1px solid var(--red)', borderRadius: 'var(--radius)', color: 'var(--text)', background: 'var(--surface)' }}>
      Issue history could not be loaded for {failedRepos.length} {failedRepos.length === 1 ? 'repository' : 'repositories'}. Results are partial; re-run the audit to retry.
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer' }}>Show affected repositories</summary>
        <ul style={{ margin: '8px 0 0 20px' }}>
          {failedRepos.map(repo => <li key={repo}>{repo}</li>)}
        </ul>
      </details>
    </div>
  )
}
