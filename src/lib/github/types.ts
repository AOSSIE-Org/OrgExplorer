export interface Repository {
  name: string;
  full_name: string;
  html_url: string;
}

export interface Author {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface PullRequest {
  id: number;
  title: string;
  repository: Repository;
  user: Author;
  created_at: string;
  html_url: string;
  state: string;
  merged_at?: string;
}

export interface Issue {
  id: number;
  title: string;
  repository: Repository;
  user: Author;
  created_at: string;
  html_url: string;
  state: string;
}

export interface ContributorSummary {
  login: string;
  avatarUrl: string;
  pullRequestCount: number;
  issueCount: number;
  mergedPRCount: number;
  repositories: Map<string, number>;
  totalContributions: number;
}

export interface ContributorMatrixData {
  contributors: ContributorSummary[];
  repositories: string[];
  activityByContributor: Map<string, Map<string, number>>;
  totalPRs: number;
  totalIssues: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
