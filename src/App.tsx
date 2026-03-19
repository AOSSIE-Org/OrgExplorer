import { useEffect, useState } from 'react';
import type { Repository } from './types/github';
import { RepositoryCard } from './components/RepositoryCard';

const ORGS = ['AOSSIE-Org', 'StabilityNexus', 'DjedAlliance'];
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllRepos = async () => {
      try {
        setLoading(true);
        const requests = ORGS.map(org => 
          fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, {
            headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
          }).then(res => {
            if (!res.ok) throw new Error(`GitHub API Error: ${res.status} on ${org}`);
            return res.json();
          })
        );

        const results = await Promise.all(requests);
        const allRepos: Repository[] = results.flat().sort((a, b) => b.stargazers_count - a.stargazers_count);
        
        setRepos(allRepos);
      } catch (err) {
      
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllRepos();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#242424', color: 'white' }}>
      <h2>Loading AOSSIE Ecosystem...</h2>
    </div>
  );

  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '40px', backgroundColor: '#242424', color: 'white', minHeight: '100vh' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid #444', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0' }}>AOSSIE Org Explorer</h1>
        <p style={{ color: '#aaa' }}>Aggregating {repos.length} repositories across foundational organizations</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
        {repos.map(repo => (
          <RepositoryCard key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}

export default App;