import type { ContributorMatrixData } from '../../../lib/github/types';

interface ContributorMatrixProps {
  data: ContributorMatrixData;
  allRepositories: string[];
}

export const ContributorMatrix: React.FC<ContributorMatrixProps> = ({
  data,
  allRepositories,
}) => {
  const displayRepos = allRepositories.slice(0, 15);
  const hasMoreRepos = allRepositories.length > 15;

  const getActivityCount = (login: string, repo: string): number => {
    const contributor = data.contributors.find(c => c.login === login);
    return contributor?.repositories.get(repo) || 0;
  };

  const getActivityColor = (count: number): string => {
    if (count === 0) return '#f0f0f0';
    if (count === 1) return '#c6e48b';
    if (count <= 3) return '#7bc96f';
    if (count <= 5) return '#239a3b';
    return '#196127';
  };

  if (data.contributors.length === 0) {
    return (
      <div className="matrix-empty">
        <p>No contributor activity found for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="contributor-matrix">
      <table>
        <thead>
          <tr>
            <th>Contributor</th>
            {displayRepos.map(repo => (
              <th key={repo} className="repo-header" title={repo}>
                {repo.length > 10 ? repo.slice(0, 10) + '...' : repo}
              </th>
            ))}
            {hasMoreRepos && <th>...</th>}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.contributors.map(contributor => (
            <tr key={contributor.login}>
              <td className="contributor-cell">
                <img 
                  src={contributor.avatarUrl} 
                  alt={contributor.login}
                  className="avatar"
                />
                <a 
                  href={contributor.login.includes('http') ? contributor.login : `https://github.com/${contributor.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {contributor.login}
                </a>
              </td>
              {displayRepos.map(repo => {
                const count = getActivityCount(contributor.login, repo);
                return (
                  <td
                    key={repo}
                    className="activity-cell"
                    style={{ backgroundColor: getActivityColor(count) }}
                    title={`${repo}: ${count} contributions`}
                  >
                    {count > 0 && <span className="count">{count}</span>}
                  </td>
                );
              })}
              {hasMoreRepos && <td className="more-cell">+{allRepositories.length - 15}</td>}
              <td className="total-cell">
                <strong>{contributor.totalContributions}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="matrix-legend">
        <span>Less</span>
        <div className="legend-item" style={{ backgroundColor: '#f0f0f0' }} />
        <div className="legend-item" style={{ backgroundColor: '#c6e48b' }} />
        <div className="legend-item" style={{ backgroundColor: '#7bc96f' }} />
        <div className="legend-item" style={{ backgroundColor: '#239a3b' }} />
        <div className="legend-item" style={{ backgroundColor: '#196127' }} />
        <span>More</span>
      </div>
    </div>
  );
};
