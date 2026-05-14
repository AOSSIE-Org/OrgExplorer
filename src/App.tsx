import { useState } from 'react'

import './App.css'

import OrgCard from './components/orgcard'
import SearchBar from './components/serachbar'

import { fetchOrganization } from './services/githubapi'

import type { GitHubOrg } from './types/github'

function App() {
  const [organization, setOrganization] =
    useState<GitHubOrg | null>(null)

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  async function handleSearch(orgName: string) {
    try {
      setLoading(true)
      setError('')

      const data = await fetchOrganization(orgName)

      setOrganization(data)
    } catch {
      setOrganization(null)
      setError('Organization not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <h1>OrgExplorer</h1>

      <SearchBar onSearch={handleSearch} />

      {loading && <p>Loading...</p>}

      {error && <p>{error}</p>}

      {organization && (
        <OrgCard organization={organization} />
      )}
    </div>
  )
}

export default App