import { useEffect, useState } from 'react';
import type { Repository } from './types/github';
import { RepositoryCard } from './components/RepositoryCard';
import { UI_STRINGS } from './constants/strings';

const ORGS = ['AOSSIE-Org', 'StabilityNexus', 'DjedAlliance'];

/**
 * SECURITY NOTE: In a standard app, tokens should not be on the client.
 * However, to fulfill AOSSIE's "Sunny" (Cloud-less/No-Backend) requirement, 
 * this app is designed to be user-operated where the user provides their own 
 * Personal Access Token (PAT) stored only in the browser context.
 */
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgRepos = async (org: string, page = 1): Promise<Repository[]> => {
      const response = await fetch(
        `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`,
        {
          headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
        }
      );
      if (!response.ok) throw new Error(`${response.status} while fetching ${org}`);
      return response.json();
    };

    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Using allSettled so that if one Org fails, the others still display
        const results = await Promise.allSettled(ORGS.map(org => fetchOrgRepos(org)));
        
        const successfulRepos = results
          .filter((result): result is PromiseFulfilledResult<Repository[]> => result.status === 'fulfilled')
          .map(result => result.value)
          .flat()
          .sort((a, b) => b.stargazers_count - a.stargazers_count);

        setRepos(successfulRepos);

        if (successfulRepos.length === 0) {
          setError("No data could be retrieved from GitHub.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : UI_STRINGS.UNKNOWN_ERROR);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#242424', color: 'white' }}>
      <h2>{UI_STRINGS.LOADING}</h2>
    </div>
  );

  if (error) return (
    <div style={{ color: 'red', textAlign: 'center', padding: '50px', backgroundColor: '#242424', minHeight: '100vh' }}>
      {UI_STRINGS.ERROR_PREFIX} {error}
    </div>
  );

  return (
    <div style={{ padding: '40px', backgroundColor: '#242424', color: 'white', minHeight: '100vh' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid #444', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0' }}>{UI_STRINGS.DASHBOARD_TITLE}</h1>
        <p style={{ color: '#aaa' }}>
          {UI_STRINGS.SUBTITLE_PREFIX} {repos.length} {UI_STRINGS.SUBTITLE_SUFFIX}
        </p>
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