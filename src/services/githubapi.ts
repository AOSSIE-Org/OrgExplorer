import type { GitHubOrg } from '../types/github'

export async function fetchOrganization(
  orgName: string,
): Promise<GitHubOrg> {
  const response = await fetch(
    `https://api.github.com/orgs/${encodeURIComponent(orgName)}`,
  )

  if (response.status === 404) {
    throw new Error('Organization not found')
  }

  if (response.status === 403) {
    throw new Error('GitHub API rate limit exceeded')
  }

  if (!response.ok) {
    throw new Error('Something went wrong')
  }

  return response.json()
}