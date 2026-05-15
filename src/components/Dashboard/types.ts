export interface Repository {
  id: number;
  name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  open_issues_count: number;
  updated_at: string;
  html_url: string;
  // Mockable/Extracted data
  open_issues?: number;
  closed_issues?: number;
  open_prs?: number;
  merged_prs?: number;
  closed_prs?: number;
}

export interface OrgStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalOpenIssues: number;
  totalPRs: number;
  languageCount: number;
}

export interface LanguageData {
  name: string;
  value: number;
}

export interface ContributorData {
  name: string;
  commits: number;
}
