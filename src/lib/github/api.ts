import { searchAllPRs, searchAllIssues, fetchAllOrgRepositories, getRateLimit, type RateLimitInfo, type GitHubSearchItem, type GitHubRepository } from './client';
import type { ContributorMatrixData, ContributorSummary } from './types';

export const fetchOrgActivity = async (
  org: string,
  fromDate: string,
  maxResults: number = 500
): Promise<ContributorMatrixData> => {
  try {
    const [allPullRequests, allIssues, allRepos] = await Promise.all([
      searchAllPRs(org, fromDate, maxResults),
      searchAllIssues(org, fromDate, maxResults),
      fetchAllOrgRepositories(org, 300)
    ]);

    return transformToContributorMatrix(allPullRequests, allIssues, allRepos, fromDate);
  } catch (error) {
    console.error('Error fetching org activity:', error);
    throw error;
  }
};

interface ContributorData {
  login: string;
  avatarUrl: string;
  pullRequestCount: number;
  issueCount: number;
  mergedPRCount: number;
  closedPRCount: number;
  openPRCount: number;
  repositories: Map<string, {
    prs: number;
    merged: number;
    closed: number;
    open: number;
    issues: number;
  }>;
  totalContributions: number;
}

const transformToContributorMatrix = (
  pullRequests: GitHubSearchItem[],
  issues: GitHubSearchItem[],
  allRepos: GitHubRepository[],
  fromDate: string
): ContributorMatrixData => {
  const contributorMap = new Map<string, ContributorData>();
  const repoSet = new Set<string>(allRepos.map(r => r.name));
  const activityMatrix = new Map<string, Map<string, number>>();
  
  pullRequests.forEach(pr => {
    if (!pr.user) return;
    
    const login = pr.user.login;
    const repoName = pr.repository_url?.split('/').pop() || '';
    repoSet.add(repoName);
    
    if (!contributorMap.has(login)) {
      contributorMap.set(login, {
        login,
        avatarUrl: pr.user.avatar_url,
        pullRequestCount: 0,
        issueCount: 0,
        mergedPRCount: 0,
        closedPRCount: 0,
        openPRCount: 0,
        repositories: new Map(),
        totalContributions: 0,
      });
    }
    
    const contributor = contributorMap.get(login)!;
    contributor.pullRequestCount++;
    contributor.totalContributions++;
    
    const isMerged = pr.state === 'closed' && pr.merged_at;
    const isClosed = pr.state === 'closed' && !pr.merged_at;
    const isOpen = pr.state === 'open';
    
    if (isMerged) {
      contributor.mergedPRCount++;
    } else if (isClosed) {
      contributor.closedPRCount++;
    } else if (isOpen) {
      contributor.openPRCount++;
    }
    
    if (!contributor.repositories.has(repoName)) {
      contributor.repositories.set(repoName, {
        prs: 0,
        merged: 0,
        closed: 0,
        open: 0,
        issues: 0,
      });
    }
    const repoData = contributor.repositories.get(repoName)!;
    repoData.prs++;
    if (isMerged) repoData.merged++;
    if (isClosed) repoData.closed++;
    if (isOpen) repoData.open++;
    
    if (!activityMatrix.has(login)) {
      activityMatrix.set(login, new Map());
    }
    const repoActivity = activityMatrix.get(login)!;
    const count = repoActivity.get(repoName) || 0;
    repoActivity.set(repoName, count + 1);
  });
  
  issues.forEach(issue => {
    if (!issue.user) return;
    
    const login = issue.user.login;
    const repoName = issue.repository_url?.split('/').pop() || '';
    repoSet.add(repoName);
    
    if (!contributorMap.has(login)) {
      contributorMap.set(login, {
        login,
        avatarUrl: issue.user.avatar_url,
        pullRequestCount: 0,
        issueCount: 0,
        mergedPRCount: 0,
        closedPRCount: 0,
        openPRCount: 0,
        repositories: new Map(),
        totalContributions: 0,
      });
    }
    
    const contributor = contributorMap.get(login)!;
    contributor.issueCount++;
    contributor.totalContributions++;
    
    if (!contributor.repositories.has(repoName)) {
      contributor.repositories.set(repoName, {
        prs: 0,
        merged: 0,
        closed: 0,
        open: 0,
        issues: 0,
      });
    }
    const repoData = contributor.repositories.get(repoName)!;
    repoData.issues++;
    
    if (!activityMatrix.has(login)) {
      activityMatrix.set(login, new Map());
    }
    const repoActivity = activityMatrix.get(login)!;
    const count = repoActivity.get(repoName) || 0;
    repoActivity.set(repoName, count + 1);
  });
  
  const contributors: ContributorSummary[] = Array.from(contributorMap.values())
    .map(c => ({
      login: c.login,
      avatarUrl: c.avatarUrl,
      pullRequestCount: c.pullRequestCount,
      issueCount: c.issueCount,
      mergedPRCount: c.mergedPRCount,
      repositories: new Map(
        Array.from(c.repositories.entries()).map(([repo, data]) => [
          repo,
          data.prs + data.issues
        ])
      ),
      totalContributions: c.totalContributions,
    }))
    .sort((a, b) => b.totalContributions - a.totalContributions);
  
  const repositories = Array.from(repoSet).sort();
  
  return {
    contributors,
    repositories,
    activityByContributor: activityMatrix,
    totalPRs: pullRequests.length,
    totalIssues: issues.length,
    dateRange: {
      start: fromDate,
      end: new Date().toISOString().split('T')[0],
    },
  };
};

export const calculateContributorStats = (data: ContributorMatrixData) => {
  const { contributors } = data;
  
  const topContributors = contributors.slice(0, 10);
  const mostActiveRepo = new Map<string, number>();
  
  contributors.forEach(c => {
    c.repositories.forEach((count, repo) => {
      const current = mostActiveRepo.get(repo) || 0;
      mostActiveRepo.set(repo, current + count);
    });
  });
  
  const topRepositories = Array.from(mostActiveRepo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  return {
    totalContributors: contributors.length,
    topContributors,
    topRepositories,
    averageContributions: contributors.length > 0
      ? Math.round(contributors.reduce((sum, c) => sum + c.totalContributions, 0) / contributors.length)
      : 0,
  };
};

export const checkRateLimit = async (): Promise<RateLimitInfo> => {
  return getRateLimit();
};
