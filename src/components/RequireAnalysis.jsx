import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/**
 * Guards the routes that can only render once an organization has been analyzed.
 *
 * The cached analysis is restored asynchronously on startup, so this waits for
 * `hydrating` to settle before deciding anything — otherwise a reload would
 * redirect away a fraction of a second before its own data arrived.
 *
 * When there is genuinely nothing to show (no cache, or an expired one), send
 * people to the organization picker, which is the only place an analysis can be
 * started. Previously those routes rendered an empty page between the navbar and
 * the footer, and /network threw "Cannot read properties of null".
 *
 * `loading` keeps the children mounted while explore() refetches — it clears the
 * model first, and each page shows its own skeleton during that window.
 */
export default function RequireAnalysis({ children }) {
  const { model, loading, hydrating } = useApp()

  if (hydrating) return null

  if (!model && !loading) return <Navigate to="/" replace />

  return children
}
