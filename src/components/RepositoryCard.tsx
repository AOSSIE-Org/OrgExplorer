import type { Repository } from '../types/github';

interface Props {
  repo: Repository;
}

export const RepositoryCard = ({ repo }: Props) => {
  return (
    <div style={{ 
      border: '1px solid #333', 
      padding: '20px', 
      borderRadius: '12px', 
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <span style={{ fontSize: '0.7rem', color: '#ffd700', textTransform: 'uppercase' }}>
          {repo.owner.login}
        </span>
        <h3 style={{ margin: '5px 0 10px 0' }}>
          <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ color: '#646cff', textDecoration: 'none' }}>
            {repo.name}
          </a>
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#ccc', height: '45px', overflow: 'hidden' }}>
          {repo.description || "No description provided."}
        </p>
      </div>
      
      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa' }}>
        <div>
          <span style={{ marginRight: '10px' }}>⭐ {repo.stargazers_count}</span>
          <span>🍴 {repo.forks_count}</span>
        </div>
        <span style={{ fontWeight: 'bold' }}>{repo.language || 'Docs'}</span>
      </div>
    </div>
  );
};