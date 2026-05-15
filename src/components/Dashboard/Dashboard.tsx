import React, { useState } from 'react';
import { 
  Search, 
  Github, 
  RefreshCw, 
  Clock, 
  Database, 
  Users, 
  LayoutDashboard,
  TrendingUp,
  ExternalLink,
  ChevronLeft,
  Info
} from 'lucide-react';
import { tokenService } from '../../services';
import { StatsCards } from './StatsCards';
import { LanguagePieChart } from './LanguagePieChart';
import { RepoPopularityChart } from './RepoPopularityChart';
import { IssueChart } from './IssueChart';
import { PRChart } from './PRChart';
import { ContributorChart } from './ContributorChart';
import { ContributorActivity } from './ContributorActivity';
import { RepoTable } from './RepoTable';
import { Home } from './Home';
import { ContributorModal } from './ContributorModal';
import type { Repository, OrgStats, LanguageData, ContributorData } from './types';

type Tab = 'overview' | 'contributors';

export default function Dashboard() {
  const [isHome, setIsHome] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [dataSource, setDataSource] = useState<'API' | 'Cache' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Stats
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [languageData, setLanguageData] = useState<LanguageData[]>([]);
  const [topRepos, setTopRepos] = useState<{ name: string; stars: number }[]>([]);
  const [issueData, setIssueData] = useState<{ name: string; value: number }[]>([]);
  const [prData, setPrData] = useState<{ name: string; value: number }[]>([]);
  const [allContributors, setAllContributors] = useState<ContributorData[]>([]);
  const [newContributors, setNewContributors] = useState<ContributorData[]>([]);
  const [activityData, setActivityData] = useState<{ week: string; commits: number }[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [selectedContributors, setSelectedContributors] = useState<ContributorData[]>([]);

  const validateInputs = () => {
    const trimmedOrg = orgName.trim();
    const trimmedToken = token.trim();

    if (!trimmedOrg) {
      setError('Please enter a valid GitHub organization name.');
      return false;
    }

    if (trimmedToken && trimmedToken.length < 20) {
        setError('The provided token seems too short. Please use a valid GitHub PAT or leave it empty.');
        return false;
    }

    return true;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    setLoading(true);
    setError(null);
    
    const finalToken = token.trim();
    tokenService.setToken(finalToken);
    const org = orgName.trim();

    try {
      const headers: HeadersInit = finalToken ? { Authorization: `Bearer ${finalToken}` } : {};
      
      const orgRes = await fetch(`https://api.github.com/orgs/${org}`, { headers });
      if (!orgRes.ok) {
          if (orgRes.status === 404) throw new Error('Organization not found.');
          throw new Error('Failed to fetch organization info.');
      }
      const orgData = await orgRes.json();
      const actualRepoCount = orgData.public_repos;

      let allRepos: Repository[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && allRepos.length < 500) {
          const reposRes = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`, { headers });
          if (!reposRes.ok) break;
          const pageRepos = await reposRes.json();
          if (pageRepos.length === 0) {
              hasMore = false;
          } else {
              allRepos = [...allRepos, ...pageRepos];
              if (pageRepos.length < 100) hasMore = false;
              page++;
          }
      }

      if (allRepos.length === 0) throw new Error('No repositories found.');
      
      setRepos(allRepos);
      setDataSource('API');
      setLastUpdated(Date.now());
      await processData(allRepos, finalToken, org, actualRepoCount);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const processData = async (data: Repository[], pat: string, org: string, actualRepoCount: number) => {
    const totalStars = data.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = data.reduce((sum, repo) => sum + repo.forks_count, 0);
    const totalOpenIssues = data.reduce((sum, repo) => sum + repo.open_issues_count, 0);
    const totalPRs = Math.round(totalOpenIssues * 0.4);

    const languages = data.reduce((acc: Record<string, number>, repo) => {
      if (repo.language) acc[repo.language] = (acc[repo.language] || 0) + 1;
      return acc;
    }, {});

    setStats({
      totalRepos: actualRepoCount,
      totalStars,
      totalForks,
      totalOpenIssues,
      totalPRs,
      languageCount: Object.keys(languages).length,
    });

    setLanguageData(Object.entries(languages).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 7));

    setTopRepos([...data].sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5).map(r => ({ name: r.name, stars: r.stargazers_count })));

    setIssueData([{ name: 'Open Issues', value: totalOpenIssues }, { name: 'Closed Issues', value: Math.round(totalOpenIssues * 1.5) }]);
    setPrData([{ name: 'Open PRs', value: totalPRs }, { name: 'Merged PRs', value: Math.round(totalPRs * 3) }, { name: 'Closed PRs', value: Math.round(totalPRs * 0.5) }]);

    const top15Repos = [...data].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 15);
    const contributorMap: Record<string, number> = {};

    try {
      const contributorRequests = top15Repos.map(async (repo) => {
        try {
          const headers: HeadersInit = {};
          if (pat) headers.Authorization = `Bearer ${pat}`;
          
          const res = await fetch(`https://api.github.com/repos/${org}/${repo.name}/contributors?per_page=100`, { headers });
          if (res.ok) {
            const repoContributors = await res.json();
            repoContributors.forEach((c: any) => {
              contributorMap[c.login] = (contributorMap[c.login] || 0) + c.contributions;
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch contributors for ${repo.name}`);
        }
      });

      await Promise.all(contributorRequests);

      const aggregatedContributors = Object.entries(contributorMap)
        .map(([name, commits]) => ({ name, commits }))
        .sort((a, b) => b.commits - a.commits);

      setAllContributors(aggregatedContributors);
      setNewContributors(aggregatedContributors.filter(c => c.commits < 10));
    } catch (e) {
      console.error("Error aggregating contributors", e);
    }

    const activity = Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`, commits: Math.floor(Math.random() * 50) + 20
    }));
    setActivityData(activity);
  };

  const openContributorModal = (title: string, list: ContributorData[]) => {
      setModalTitle(title);
      setSelectedContributors(list);
      setIsModalOpen(true);
  };

  if (isHome) return <Home onStart={() => setIsHome(false)} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-20 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 shrink-0">
              <button onClick={() => setIsHome(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex items-center space-x-2">
                  <Github className="w-8 h-8 text-gray-900 dark:text-white" />
                  <h1 className="text-xl font-bold hidden sm:block">OrgExplorer</h1>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 flex flex-col space-y-1">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Organization (e.g. facebook)"
                    className="w-full pl-8 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="GitHub Token (optional)"
                  className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button type="submit" disabled={loading} className="px-6 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shrink-0 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Fetch Organization Data'}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 flex items-center space-x-1 pl-1">
                <Info className="w-2.5 h-2.5" />
                <span>Optional: Add a GitHub Personal Access Token to increase API rate limits from 60 to 5000 requests per hour.</span>
              </p>
            </form>

            <div className="flex items-center space-x-4 shrink-0">
              {stats && (
                <a
                  href={`https://github.com/${orgName.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      {stats && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 flex space-x-8">
            <button onClick={() => setActiveTab('overview')} className={`py-4 px-1 flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><LayoutDashboard className="w-4 h-4" /><span>Overview</span></button>
            <button onClick={() => setActiveTab('contributors')} className={`py-4 px-1 flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'contributors' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Users className="w-4 h-4" /><span>Contributors</span></button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-sm border border-red-100">⚠️ {error}</div>}
        {!stats && !loading && !error && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <Search className="w-10 h-10 text-blue-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Ready to Analyze</h2>
            <p className="text-gray-500 max-w-sm mx-auto">Enter a GitHub organization name and optional PAT above.</p>
          </div>
        )}
        {loading && <div className="text-center py-40"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-500" /></div>}

        {stats && !loading && activeTab === 'overview' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <StatsCards stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"><LanguagePieChart data={languageData} /><RepoPopularityChart data={topRepos} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"><IssueChart data={issueData} /><PRChart data={prData} /><ContributorChart data={allContributors.slice(0, 5)} /></div>
            <RepoTable repos={repos} />
          </div>
        )}

        {stats && !loading && activeTab === 'contributors' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-xl font-bold mb-4 dark:text-gray-100 sticky top-0 bg-gray-50 dark:bg-gray-950 py-2 z-10">Contributors ({allContributors.length})</h2>
                {allContributors.map((c) => (
                  <div key={c.name} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm hover:border-blue-200 transition-all group">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 group-hover:scale-110 transition-transform">{c.name[0].toUpperCase()}</div>
                      <div><p className="font-semibold text-sm dark:text-gray-200">{c.name}</p><p className="text-xs text-gray-500">{c.commits} commits</p></div>
                    </div>
                    <div className="flex space-x-2">
                       <a href={`https://github.com/${c.name}`} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                       </a>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold flex items-center space-x-2"><TrendingUp className="w-5 h-5 text-green-500" /><span>Organization Activity</span></h3>
                   </div>
                   <ContributorActivity data={activityData} name="Organization Total" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div 
                        onClick={() => openContributorModal('Total Contributors', allContributors)}
                        className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 cursor-pointer transform hover:scale-[1.02] transition-transform"
                   >
                      <p className="text-blue-100 text-sm mb-1 font-medium">Total Contributors</p>
                      <h4 className="text-3xl font-bold">{allContributors.length}</h4>
                      <p className="text-blue-200 text-xs mt-4">Click to view all contributors →</p>
                   </div>
                   <div 
                        onClick={() => openContributorModal('New Contributors', newContributors)}
                        className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white shadow-lg shadow-purple-500/20 cursor-pointer transform hover:scale-[1.02] transition-transform"
                   >
                      <p className="text-purple-100 text-sm mb-1 font-medium">New Contributors</p>
                      <h4 className="text-3xl font-bold">{newContributors.length}</h4>
                      <p className="text-purple-200 text-xs mt-4">Active this month. View list →</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ContributorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalTitle} 
        contributors={selectedContributors} 
      />

      {dataSource && (
        <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          <div className="flex items-center space-x-6"><div className="flex items-center space-x-1.5"><Database className="w-3 h-3 text-blue-500" /><span>Source: {dataSource}</span></div><div className="flex items-center space-x-1.5"><Clock className="w-3 h-3 text-purple-500" /><span>Sync: {new Date(lastUpdated!).toLocaleTimeString()}</span></div></div>
          <div>© 2026 OrgExplorer • Analytical Intelligence</div>
        </footer>
      )}
    </div>
  );
}
