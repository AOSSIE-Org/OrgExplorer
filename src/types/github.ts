export interface Repo {
  id: number;
  name: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export interface Insight {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  inactivePercent: string;
  topRepos : Repo[];
  insights: string[];
}