interface ContributorStatsProps {
  stats: {
    totalContributors: number;
    topContributors: Array<{
      login: string;
      avatarUrl: string;
      totalContributions: number;
      pullRequestCount: number;
      mergedPRCount: number;
      issueCount: number;
    }>;
    topRepositories: [string, number][];
    averageContributions: number;
  };
}

export const ContributorStats: React.FC<ContributorStatsProps> = ({ stats }) => {
  return (
    <div className="contributor-stats">
      <div className="stat-card">
        <h3>Total Contributors</h3>
        <p className="stat-value">{stats.totalContributors}</p>
      </div>
      <div className="stat-card">
        <h3>Avg. Contributions</h3>
        <p className="stat-value">{stats.averageContributions}</p>
      </div>
      <div className="stat-card">
        <h3>Top Contributors</h3>
        <ul className="top-list">
          {stats.topContributors.slice(0, 5).map((contributor, index) => (
            <li key={contributor.login}>
              <span className="rank">#{index + 1}</span>
              <img src={contributor.avatarUrl} alt={contributor.login} />
              <span className="name">{contributor.login}</span>
              <span className="count">{contributor.totalContributions}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="stat-card">
        <h3>Most Active Repos</h3>
        <ul className="top-list">
          {stats.topRepositories.slice(0, 5).map(([repo, count]) => (
            <li key={repo}>
              <span className="name">{repo}</span>
              <span className="count">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
