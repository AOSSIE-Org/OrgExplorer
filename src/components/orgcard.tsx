import type { GitHubOrg } from '../types/github'

interface OrgCardProps {
  organization: GitHubOrg
}

function OrgCard({ organization }: OrgCardProps) {
  return (
    <div className="org-card">
      <img
        src={organization.avatar_url}
        alt={organization.login}
        width={120}
        height={120}
      />

      <h2>{organization.login}</h2>

      <p>
        {organization.description ?? 'No description available'}
      </p>

      <p>Followers: {organization.followers}</p>

      <p>Public Repositories: {organization.public_repos}</p>

      <a
        href={organization.html_url}
        target="_blank"
        rel="noreferrer"
      >
        Visit GitHub Profile
      </a>
    </div>
  )
}

export default OrgCard