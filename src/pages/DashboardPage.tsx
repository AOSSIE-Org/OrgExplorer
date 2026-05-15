import { useState, useEffect, useCallback, type ReactNode } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import OrgOverview from '../components/Dashboard/OrgOverview';
import StatCard from '../components/Dashboard/StatCard';
import DebugPanel from '../components/DebugPanel';
import OverviewTab from '../components/Metrics/OverviewTab';
import ReposTab from '../components/Metrics/ReposTab';
import ContributorsTab from '../components/Metrics/ContributorsTab';
import ActivityTab from '../components/Metrics/ActivityTab';
import NetworkTab from '../components/Metrics/NetworkTab';
import RepoDetailPanel from '../components/Metrics/RepoDetailPanel';
import { useOrg } from '../hooks/useOrg';
import { useApp } from '../context/AppContext';
import { useRepos } from '../hooks/useRepos';
import type { RepoData } from '../types';

type Tab = 'overview' | 'repositories' | 'contributors' | 'activity' | 'network';

// Icon set
const Icons = {
  Repo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Star: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  Fork: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/><path d="M6 9a9 9 0 0 0 9 2"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Grid: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Activity: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  ),
  Network: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  ),
};

const DEFAULT_ORG = 'aossie';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentOrgName, setCurrentOrgName] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<RepoData | null>(null);

  const { token } = useApp();
  const { org, loading: orgLoading, error: orgError, fetchOrgData } = useOrg();
  const { repos, loading: reposLoading, error: reposError, fetchRepoData } = useRepos();

  const handleSearch = useCallback(async (name: string) => {
    setCurrentOrgName(name);
    setActiveTab('overview');
    await Promise.all([fetchOrgData(name), fetchRepoData(name)]);
  }, [fetchOrgData, fetchRepoData]);

  // Load default org on mount
  useEffect(() => {
    void handleSearch(DEFAULT_ORG);
  }, [handleSearch]);

  const loading = orgLoading || reposLoading;
  const error = orgError ?? reposError;

  // Aggregate stats from repos
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);

  const hasData = !!(org || repos.length > 0);

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode; count?: number }> = [
    { id: 'overview',     label: 'Overview',     icon: <Icons.Grid /> },
    { id: 'repositories', label: 'Repositories', icon: <Icons.BookOpen />, count: repos.length },
    { id: 'contributors', label: 'Contributors', icon: <Icons.Users /> },
    { id: 'activity',     label: 'Activity',     icon: <Icons.Activity /> },
    { id: 'network',      label: 'Network',      icon: <Icons.Network /> },
  ];

  return (
    <div className="app-shell">
      <Sidebar org={org} />

      <div className="main-content">
        <Header
          onSearch={handleSearch}
          loading={loading}
          currentOrg={currentOrgName}
        />

        <div className="page-content">
          {/* Error */}
          {error && (
            <div className="alert alert--error">
              <span>✗</span>
              <span>{error}</span>
            </div>
          )}

          {/* Org Overview card */}
          {org && <OrgOverview org={org} />}

          {/* Stats row */}
          {hasData && (
            <div className="stats-grid">
              <StatCard
                label="Public Repositories"
                value={org?.public_repos ?? repos.length}
                sub="Active projects"
                icon={<Icons.Repo />}
                variant="blue"
              />
              <StatCard
                label="Total Stars"
                value={totalStars}
                sub="Community appreciation"
                icon={<Icons.Star />}
                variant="orange"
              />
              <StatCard
                label="Total Forks"
                value={totalForks}
                sub="Code reuse"
                icon={<Icons.Fork />}
                variant="green"
              />
              <StatCard
                label="Followers"
                value={org?.followers ?? 0}
                sub="Organization followers"
                icon={<Icons.Users />}
                variant="purple"
              />
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <span>Fetching data from GitHub…</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !org && !error && (
            <div className="empty-state">
              <div className="empty-state__icon" style={{ fontSize: 48 }}>🔭</div>
              <div className="empty-state__title">Explore a GitHub Organization</div>
              <div className="empty-state__desc">
                Search for any public organization above to view their repositories,
                contributors, activity, and language statistics.
              </div>
            </div>
          )}

          {/* 4-tab layout */}
          {hasData && !loading && (
            <>
              <div className="tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="tab-badge">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && <OverviewTab repos={repos} onRepoClick={setSelectedRepo} />}
              {activeTab === 'repositories' && <ReposTab repos={repos} onRepoClick={setSelectedRepo} orgName={currentOrgName} token={token ?? ''} />}
              {activeTab === 'contributors' && (
                <ContributorsTab orgName={currentOrgName} repos={repos} />
              )}
              {activeTab === 'activity' && (
                <ActivityTab orgName={currentOrgName} repos={repos} />
              )}
              {activeTab === 'network' && (
                <NetworkTab orgName={currentOrgName} repos={repos} />
              )}
            </>
          )}
        </div>
      </div>

      <DebugPanel />

      {selectedRepo && (
        <RepoDetailPanel
          repo={selectedRepo}
          orgName={currentOrgName}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </div>
  );
}
