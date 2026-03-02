const GITHUB_API_BASE = 'https://api.github.com';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

const CACHE_KEY = 'github_api_cache_';
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheData {
  data: unknown;
  timestamp: number;
}

const getCachedData = (key: string): unknown | null => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY + key);
    if (cached) {
      const parsed: CacheData = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
      sessionStorage.removeItem(CACHE_KEY + key);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const setCachedData = (key: string, data: unknown): void => {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY + key, JSON.stringify(cacheData));
  } catch {
    // Ignore cache errors
  }
};

export const clearCache = (): void => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore
  }
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  const token = localStorage.getItem('github_token');
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  return headers;
};

export const getRateLimit = async (): Promise<RateLimitInfo> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
      headers: getHeaders(),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: data.rate.reset,
      };
    }
  } catch (error) {
    console.error('Failed to get rate limit:', error);
  }
  
  const hasToken = !!localStorage.getItem('github_token');
  return { 
    limit: hasToken ? 5000 : 60, 
    remaining: hasToken ? 5000 : 60, 
    reset: 0 
  };
};

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
}

export interface GitHubSearchItem {
  id: number;
  title: string;
  state: 'open' | 'closed';
  created_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  repository_url?: string;
  merged_at?: string | null;
  pull_request?: {
    url: string;
    html_url: string;
    state: string;
  };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rateLimit = await getRateLimit();
    
    if (rateLimit.remaining < 1) {
      const waitTime = (rateLimit.reset - Date.now() / 1000) * 1000;
      if (waitTime > 0 && waitTime < 60000) {
        console.log(`Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s...`);
        await delay(waitTime);
        continue;
      }
    }
    
    try {
      const response = await fetch(url, options);
      
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message?.includes('rate limit')) {
          lastError = new Error('Rate limit exceeded');
          const waitTime = (rateLimit.reset - Date.now() / 1000) * 1000;
          if (waitTime > 0 && waitTime < 60000 && attempt < maxRetries - 1) {
            console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)}s...`);
            await delay(waitTime);
            continue;
          }
          throw new Error(`API rate limit exceeded. ${!localStorage.getItem('github_token') ? 'Add a GitHub token for higher limits.' : ''}`);
        }
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt < maxRetries - 1) {
        await delay(1000 * (attempt + 1));
      }
    }
  }
  
  throw lastError || new Error('Failed after retries');
};

export const fetchAllOrgRepositories = async (
  org: string,
  maxRepos: number = 300
): Promise<GitHubRepository[]> => {
  const cacheKey = `repos_${org}_${maxRepos}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached as GitHubRepository[];
  }

  const allRepos: GitHubRepository[] = [];
  let page = 1;
  const perPage = 100;
  
  while (allRepos.length < maxRepos) {
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/orgs/${org}/repos?page=${page}&per_page=${perPage}&sort=updated&type=all`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch repositories: ${response.status} - ${errorText}`);
    }

    const repos = await response.json();
    
    if (!repos || repos.length === 0) {
      break;
    }
    
    allRepos.push(...repos);
    
    if (repos.length < perPage || allRepos.length >= maxRepos) {
      break;
    }
    
    page++;
    await delay(200);
  }

  const result = allRepos.slice(0, maxRepos);
  setCachedData(cacheKey, result);
  return result;
};

export const searchAllPRs = async (
  org: string,
  sinceDate?: string,
  maxResults: number = 500
): Promise<GitHubSearchItem[]> => {
  const cacheKey = `prs_${org}_${sinceDate}_${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached as GitHubSearchItem[];
  }

  const allPRs: GitHubSearchItem[] = [];
  let page = 1;
  const perPage = 100;
  
  while (allPRs.length < maxResults) {
    const query = `org:${org} is:pr${sinceDate ? ` created:>${sinceDate}` : ''}`;
    
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=created&order=desc`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search PRs: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      break;
    }
    
    allPRs.push(...data.items);
    
    if (data.items.length < perPage || allPRs.length >= maxResults) {
      break;
    }
    
    page++;
    await delay(300);
  }

  const result = allPRs.slice(0, maxResults);
  setCachedData(cacheKey, result);
  return result;
};

export const searchAllIssues = async (
  org: string,
  sinceDate?: string,
  maxResults: number = 500
): Promise<GitHubSearchItem[]> => {
  const cacheKey = `issues_${org}_${sinceDate}_${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached as GitHubSearchItem[];
  }

  const allIssues: GitHubSearchItem[] = [];
  let page = 1;
  const perPage = 100;
  
  while (allIssues.length < maxResults) {
    const query = `org:${org} is:issue is:open${sinceDate ? ` created:>${sinceDate}` : ''}`;
    
    const response = await fetchWithRetry(
      `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=created&order=desc`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search issues: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      break;
    }
    
    allIssues.push(...data.items);
    
    if (data.items.length < perPage || allIssues.length >= maxResults) {
      break;
    }
    
    page++;
    await delay(300);
  }

  const result = allIssues.slice(0, maxResults);
  setCachedData(cacheKey, result);
  return result;
};

export const searchRepositories = async (
  org: string,
  page: number = 1,
  perPage: number = 100
): Promise<{ repos: GitHubRepository[]; hasMore: boolean }> => {
  const response = await fetchWithRetry(
    `${GITHUB_API_BASE}/orgs/${org}/repos?page=${page}&per_page=${perPage}&sort=updated`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  const repos = await response.json();
  const linkHeader = response.headers.get('Link');
  const hasMore = linkHeader?.includes('rel="next"') || false;

  return { repos, hasMore };
};

export const searchPullRequests = async (
  org: string,
  state: string = 'all',
  sinceDate?: string,
  page: number = 1,
  perPage: number = 100
): Promise<{ prs: GitHubSearchItem[]; hasMore: boolean }> => {
  let query = `org:${org} is:pr`;
  
  if (state === 'merged') {
    query += ' is:merged';
  } else if (state === 'open') {
    query += ' is:open';
  }
  
  if (sinceDate) {
    query += ` created:>${sinceDate}`;
  }

  const response = await fetchWithRetry(
    `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=created&order=desc`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to search pull requests: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    prs: data.items || [],
    hasMore: page * perPage < data.total_count,
  };
};

export const searchIssues = async (
  org: string,
  state: string = 'open',
  sinceDate?: string,
  page: number = 1,
  perPage: number = 100
): Promise<{ issues: GitHubSearchItem[]; hasMore: boolean }> => {
  let query = `org:${org} is:issue`;
  
  if (state === 'open') {
    query += ' is:open';
  } else if (state === 'closed') {
    query += ' is:closed';
  }
  
  if (sinceDate) {
    query += ` created:>${sinceDate}`;
  }

  const response = await fetchWithRetry(
    `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=created&order=desc`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    throw new Error(`Failed to search issues: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    issues: data.items || [],
    hasMore: page * perPage < data.total_count,
  };
};
