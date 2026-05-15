import type { OrgData } from '../../types';

interface Props {
  org: OrgData;
}

export default function OrgOverview({ org }: Props) {
  return (
    <div className="org-overview">
      <img
        src={org.avatar_url}
        alt={org.login}
        className="org-overview__avatar"
      />
      <div className="org-overview__info">
        <h1 className="org-overview__name">{org.name ?? org.login}</h1>
        <div className="org-overview__handle">@{org.login}</div>
        {org.description && (
          <p className="org-overview__desc">{org.description}</p>
        )}
        <div className="org-overview__meta">
          {org.location && (
            <span className="org-overview__meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {org.location}
            </span>
          )}
          {org.blog && (
            <a
              href={org.blog.startsWith('http') ? org.blog : `https://${org.blog}`}
              target="_blank"
              rel="noopener noreferrer"
              className="org-overview__meta-item"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {org.blog}
            </a>
          )}
          {org.twitter_username && (
            <a
              href={`https://twitter.com/${org.twitter_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="org-overview__meta-item"
            >
              𝕏 @{org.twitter_username}
            </a>
          )}
          <span className="org-overview__meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Joined {new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <a
            href={org.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="org-overview__meta-item"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub Profile
          </a>
        </div>
      </div>
    </div>
  );
}
