export interface OrgData {
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  location: string | null;
  blog: string | null;
  email: string | null;
  twitter_username: string | null;
  type: string;
}

export interface RepoData {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  visibility: string;
  fork: boolean;
  archived: boolean;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  resource?: string;
}

export interface RateLimitResponse {
  resources: {
    core: RateLimit;
    search: RateLimit;
    graphql: RateLimit;
  };
  rate: RateLimit;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type DataSource = 'api' | 'cache' | 'none';

export interface AppState {
  token: string | null;
  setToken: (token: string | null) => void;
  rateLimit: RateLimit | null;
  setRateLimit: (rl: RateLimit | null) => void;
  apiCallCount: number;
  incrementApiCallCount: () => void;
  lastDataSource: DataSource;
  setLastDataSource: (src: DataSource) => void;
}

export interface LanguageStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  repos: string[];
}

export type RepoHealth = 'active' | 'stale' | 'dead';

export interface ActivityMonth {
  month: string;   // 'Jan', 'Feb' …
  year: number;
  commits: number; // repos pushed this month (proxy)
  prs: number;     // PRs created this month
  issues: number;  // issues created this month
}

export interface OrgActivity {
  months: ActivityMonth[];
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
}

export interface RepoContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface RepoCommitWeek {
  week: number;   // unix timestamp of week start
  total: number;  // total commits that week
  days: number[]; // commits per day [Sun,Mon,...,Sat]
}

export interface RepoDetailData {
  contributors: RepoContributor[];
  commitWeeks: RepoCommitWeek[];
  languages: Record<string, number>; // language -> byte count
}
