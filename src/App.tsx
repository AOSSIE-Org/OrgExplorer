import { useEffect, useState } from 'react';
import { type Repository } from './types/github';
import { RepositoryCard } from './components/RepositoryCard';
import { UI_STRINGS } from './constants/strings';

const ORGS = ['AOSSIE-Org', 'StabilityNexus', 'DjedAlliance'];


const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    const fetchOrgRepos = async (org: string): Promise<Repository[]> => {
      let allOrgRepos: Repository[] = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await fetch(
          `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`,
          {
            headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
          }
        );

        if (!response.ok) {
          throw new Error(`${response.status} while fetching ${org}`);
        }

        const data: Repository[] = await response.json();
        allOrgRepos = [...allOrgRepos, ...data];

        if (data.length === 100) {
          page++;
        } else {
          hasNextPage = false;
        }
      }
      return allOrgRepos;
    };

    const fetchAllData = async () => {
      try {
        setLoading(true);
     
        const results = await Promise.allSettled(ORGS.map(org => fetchOrgRepos(org)));
        
        const successfulRepos = results
          .filter((result): result is PromiseFulfilledResult<Repository[]> => result.status === 'fulfilled')
          .map(result => result.value)
          .flat()
          .sort((a, b) => b.stargazers_count - a.stargazers_count);

        setRepos(successfulRepos);
        
        if (successfulRepos.length === 0) {
           const failureReasons = results
             .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
             .map(r => r.reason.message).join(', ');
           setError(`Failed to fetch data: ${failureReasons}`);
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
    <div style={styles.centerContainer}>
      <h2>{UI_STRINGS.LOADING}</h2>
    </div>
  );

  if (error) return (
    <div style={styles.errorText}>
      {UI_STRINGS.ERROR_PREFIX} {error}
    </div>
  );

  return (
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <h1 style={{ fontSize: '2.5rem', margin: '0' }}>{UI_STRINGS.DASHBOARD_TITLE}</h1>
        <p style={{ color: '#aaa' }}>
          {UI_STRINGS.SUBTITLE_PREFIX} {repos.length} {UI_STRINGS.SUBTITLE_SUFFIX}
        </p>
      </header>

      <div style={styles.grid}>
        {repos.map(repo => (
          <RepositoryCard key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}


const styles = {
  centerContainer: { display: 'flex' as const, justifyContent: 'center' as const, alignItems: 'center' as const, height: '100vh', backgroundColor: '#242424', color: 'white' },
  errorText: { color: 'red', textAlign: 'center' as const, padding: '50px', backgroundColor: '#242424', minHeight: '100vh' },
  pageContainer: { padding: '40px', backgroundColor: '#242424', color: 'white', minHeight: '100vh' },
  header: { marginBottom: '40px', borderBottom: '1px solid #444', paddingBottom: '20px' },
  grid: { display: 'grid' as const, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }
};

export default App;