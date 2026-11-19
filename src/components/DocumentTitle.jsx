import { useEffect } from 'react'
import { matchRoutes, useLocation } from 'react-router-dom'

// Use the router's matching rules, including full paths and decoded parameters.
const titleRoutes = [
  { path: '/', title: 'OrgExplorer — Home' },
  { path: '/overview', title: 'Overview — OrgExplorer' },
  { path: '/repositories', title: 'Repositories — OrgExplorer' },
  { path: '/contributors', title: 'Contributors — OrgExplorer' },
  {
    path: '/contributors/:username',
    title: ({ username }) => `${username} — Contributor Profile — OrgExplorer`,
  },
  { path: '/network', title: 'Network Graph — OrgExplorer' },
  { path: '/analytics', title: 'Analytics — OrgExplorer' },
  { path: '/governance', title: 'Governance Audit — OrgExplorer' },
  { path: '/settings', title: 'Settings — OrgExplorer' },
  { path: '/support-us', title: 'Support Us — OrgExplorer' },
  { path: '*', title: '404 Not Found — OrgExplorer' },
]

export default function DocumentTitle() {
  const { pathname } = useLocation()
  const [{ route, params }] = matchRoutes(titleRoutes, pathname)
  const title = typeof route.title === 'function' ? route.title(params) : route.title

  useEffect(() => {
    document.title = title
  }, [title])

  return null
}
