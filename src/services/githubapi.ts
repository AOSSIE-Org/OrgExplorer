import type { GitHubOrg } from '../types/github'

export async function fetchOrganization(
  orgName: string,
): Promise<GitHubOrg> {
  const response = await fetch(
    `https://api.github.com/orgs/${orgName}`,
  )

  if (!response.ok) {
    throw new Error('Organization not found')
  }

  return response.json()
}