import { fetchOrgActivity, calculateContributorStats } from '../../lib/github/api';
import type { ContributorMatrixData } from '../../lib/github/types';

export class FetchContributorActivityUseCase {
  async execute(org: string, fromDate: string): Promise<ContributorMatrixData> {
    return fetchOrgActivity(org, fromDate);
  }
}

export class GetContributorStatsUseCase {
  execute(data: ContributorMatrixData) {
    return calculateContributorStats(data);
  }
}

export class FilterContributorsUseCase {
  execute(
    data: ContributorMatrixData,
    filters: {
      minContributions?: number;
      repository?: string;
      sortBy?: 'contributions' | 'prs' | 'issues' | 'merged';
    }
  ) {
    let contributors = [...data.contributors];
    
    if (filters.minContributions && filters.minContributions > 0) {
      contributors = contributors.filter(
        c => c.totalContributions >= filters.minContributions!
      );
    }
    
    if (filters.repository) {
      contributors = contributors.filter(
        c => c.repositories.has(filters.repository!)
      );
    }
    
    switch (filters.sortBy) {
      case 'prs':
        contributors.sort((a, b) => b.pullRequestCount - a.pullRequestCount);
        break;
      case 'issues':
        contributors.sort((a, b) => b.issueCount - a.issueCount);
        break;
      case 'merged':
        contributors.sort((a, b) => b.mergedPRCount - a.mergedPRCount);
        break;
      default:
        contributors.sort((a, b) => b.totalContributions - a.totalContributions);
    }
    
    return {
      ...data,
      contributors,
    };
  }
}

export class SearchContributorsUseCase {
  execute(data: ContributorMatrixData, query: string) {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return data.contributors;
    }
    
    return data.contributors.filter(
      c => c.login.toLowerCase().includes(normalizedQuery)
    );
  }
}

export class GetContributorDetailsUseCase {
  execute(data: ContributorMatrixData, login: string) {
    return data.contributors.find(c => c.login === login) || null;
  }
}

export class ExportContributorDataUseCase {
  execute(data: ContributorMatrixData, format: 'csv' | 'json') {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    const headers = ['Login', 'Total Contributions', 'PRs', 'Merged PRs', 'Issues', 'Repositories'];
    const rows = data.contributors.map(c => [
      c.login,
      c.totalContributions.toString(),
      c.pullRequestCount.toString(),
      c.mergedPRCount.toString(),
      c.issueCount.toString(),
      Array.from(c.repositories.entries())
        .map(([repo, count]) => `${repo}(${count})`)
        .join('; ')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
