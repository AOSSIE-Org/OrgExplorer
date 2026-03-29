import type { OrgData, RepoData, RateLimit, RateLimitResponse, LanguageStat, Contributor, OrgActivity, ActivityMonth, RepoHealth, RepoDetailData, RepoContributor, RepoCommitWeek } from '../types';
import { getCache, setCache, cacheKey, TTL_ORG, TTL_REPOS, TTL_CONTRIBUTORS, TTL_ACTIVITY, TTL_REPO_DETAIL } from './cache';

const BASE = 'https://api.github.com';

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

interface FetchResult<T> {
  data: T;
  fromCache: boolean;
}

async function ghFetch<T>(
  path: string,
  token: string,
  onApiCall?: () => void,
): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  onApiCall?.();

  const res = await fetch(`${BASE}${path}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── Stats fetch with 202-retry ────────────────────────────────────────────────
// GitHub computes stats lazily and returns 202 while building them.
// Retries up to 3 times with a 2-second gap.
async function ghFetchStats<T>(
  path: string,
  token: string,
  onApiCall?: () => void,
): Promise<T | null> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise<void>((r) => setTimeout(r, 2500));
    onApiCall?.();
    const res = await fetch(`${BASE}${path}`, { headers });
    if (res.status === 202) continue; // still computing, retry
    if (!res.ok) return null;
    const data = await res.json() as T;
    if (Array.isArray(data) && (data as unknown[]).length > 0) return data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  }
  return null; // computing timed out — caller should not cache
}

// ── Rate limit ────────────────────────────────────────────────────────────────

export async function fetchRateLimit(
  token: string,
  onApiCall?: () => void,
): Promise<RateLimit> {
  const data = await ghFetch<RateLimitResponse>('/rate_limit', token, onApiCall);
  return data.resources.core;
}

// ── Organization ──────────────────────────────────────────────────────────────

export async function fetchOrg(
  orgName: string,
  token: string,
  onApiCall?: () => void,
): Promise<FetchResult<OrgData>> {
  const key = cacheKey.org(orgName);
  const cached = await getCache<OrgData>(key);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const data = await ghFetch<OrgData>(`/orgs/${orgName}`, token, onApiCall);
  await setCache(key, data, TTL_ORG);
  return { data, fromCache: false };
}

// ── Repositories ──────────────────────────────────────────────────────────────

// GraphQL query — fetches 100 repos per request using cursor pagination.
// One GraphQL call per page uses the separate graphql rate-limit bucket (5 000 pts/hr).
const GQL_REPOS_QUERY = `
query OrgRepos($login: String!, $cursor: String) {
  organization(login: $login) {
    repositories(
      first: 100
      after: $cursor
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        databaseId
        name
        nameWithOwner
        url
        description
        stargazerCount
        forkCount
        primaryLanguage { name }
        openIssues: issues(states: OPEN) { totalCount }
        updatedAt
        pushedAt
        isArchived
        isFork
        visibility
        repositoryTopics(first: 10) { nodes { topic { name } } }
      }
    }
  }
}`;

interface GQLRepoNode {
  databaseId: number;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string } | null;
  openIssues: { totalCount: number };
  updatedAt: string;
  pushedAt: string;
  isArchived: boolean;
  isFork: boolean;
  visibility: string;
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
}

interface GQLReposResult {
  data: {
    organization: {
      repositories: {
        totalCount: number;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: GQLRepoNode[];
      };
    };
  } | null;
  errors?: Array<{ message: string }>;
}

function gqlNodeToRepoData(n: GQLRepoNode): RepoData {
  return {
    id: n.databaseId,
    name: n.name,
    full_name: n.nameWithOwner,
    html_url: n.url,
    description: n.description,
    stargazers_count: n.stargazerCount,
    forks_count: n.forkCount,
    language: n.primaryLanguage?.name ?? null,
    open_issues_count: n.openIssues.totalCount,
    updated_at: n.updatedAt,
    pushed_at: n.pushedAt,
    topics: n.repositoryTopics.nodes.map((t) => t.topic.name),
    visibility: n.visibility.toLowerCase(),
    fork: n.isFork,
    archived: n.isArchived,
  };
}

// Fetch all repos via GraphQL cursor pagination (cap 1 000 repos = 10 pages).
async function fetchReposViaGraphQL(
  orgName: string,
  token: string,
  onApiCall?: () => void,
): Promise<RepoData[]> {
  const MAX_PAGES = 10;
  const all: RepoData[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    onApiCall?.();
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: GQL_REPOS_QUERY, variables: { login: orgName, cursor } }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json() as GQLReposResult;
    if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
    const repoPage = json.data?.organization.repositories;
    if (!repoPage) throw new Error('No repository data in GraphQL response');
    all.push(...repoPage.nodes.map(gqlNodeToRepoData));
    if (!repoPage.pageInfo.hasNextPage) break;
    cursor = repoPage.pageInfo.endCursor;
  }
  return all;
}

// REST fallback — used when GraphQL is unavailable (missing scope, GHES, etc.)
async function fetchReposViaREST(
  orgName: string,
  token: string,
  onApiCall?: () => void,
): Promise<RepoData[]> {
  const MAX_PAGES = 10;
  const all: RepoData[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await ghFetch<RepoData[]>(
      `/orgs/${orgName}/repos?per_page=100&page=${page}&sort=updated`,
      token,
      onApiCall,
    );
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function fetchRepos(
  orgName: string,
  token: string,
  onApiCall?: () => void,
): Promise<FetchResult<RepoData[]>> {
  const key = cacheKey.repos(orgName);
  const cached = await getCache<RepoData[]>(key);
  if (cached) return { data: cached, fromCache: true };

  // Try GraphQL first (uses separate rate-limit bucket, richer data, cursor pagination).
  // Falls back to REST if GraphQL is unavailable.
  let all: RepoData[];
  try {
    all = await fetchReposViaGraphQL(orgName, token, onApiCall);
  } catch {
    all = await fetchReposViaREST(orgName, token, onApiCall);
  }

  await setCache(key, all, TTL_REPOS);
  return { data: all, fromCache: false };
}

// ── Repository Search (GitHub Search API — scans all org repos, no local cap) ─

export async function searchOrgRepos(
  orgName: string,
  query: string,
  token: string,
  onApiCall?: () => void,
): Promise<{ totalCount: number; items: RepoData[] }> {
  onApiCall?.();
  const q = encodeURIComponent(`${query} org:${orgName}`);
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&per_page=100&sort=stars&order=desc`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (!res.ok) throw new Error(`GitHub Search: ${res.status} ${res.statusText}`);
  const json = await res.json() as {
    total_count: number;
    items: Array<{
      id: number; name: string; full_name: string; html_url: string;
      description: string | null; stargazers_count: number; forks_count: number;
      language: string | null; open_issues_count: number; updated_at: string;
      pushed_at: string; topics: string[]; visibility: string; fork: boolean; archived: boolean;
    }>;
  };
  return {
    totalCount: json.total_count,
    items: json.items.map((r) => ({
      id: r.id, name: r.name, full_name: r.full_name, html_url: r.html_url,
      description: r.description, stargazers_count: r.stargazers_count,
      forks_count: r.forks_count, language: r.language,
      open_issues_count: r.open_issues_count, updated_at: r.updated_at,
      pushed_at: r.pushed_at, topics: r.topics ?? [], visibility: r.visibility,
      fork: r.fork, archived: r.archived,
    })),
  };
}

// ── Language aggregation ──────────────────────────────────────────────────────

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dart: '#00B4AB',
  R: '#198ce7',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Other: '#8b949e',
};

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] ?? LANGUAGE_COLORS['Other']!;
}

export function aggregateLanguages(repos: RepoData[]): LanguageStat[] {
  const counts: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) {
      counts[r.language] = (counts[r.language] ?? 0) + 1;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
      color: getLanguageColor(name),
    }));
}

// ── GraphQL (optional) ────────────────────────────────────────────────────────

const GQL_QUERY = `
query OrgData($login: String!) {
  organization(login: $login) {
    name
    description
    avatarUrl
    websiteUrl
    url
    createdAt
    repositories(first: 20, orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        url
        stargazerCount
        forkCount
        primaryLanguage { name color }
        issues(states: OPEN) { totalCount }
        updatedAt
        languages(first: 5) {
          edges { size node { name color } }
        }
      }
    }
    membersWithRole { totalCount }
  }
}
`;

export interface GraphQLOrgResult {
  organization: {
    name: string;
    description: string;
    avatarUrl: string;
    websiteUrl: string | null;
    url: string;
    createdAt: string;
    repositories: {
      totalCount: number;
      nodes: Array<{
        name: string;
        url: string;
        stargazerCount: number;
        forkCount: number;
        primaryLanguage: { name: string; color: string } | null;
        issues: { totalCount: number };
        updatedAt: string;
      }>;
    };
    membersWithRole: { totalCount: number };
  };
}

export async function fetchOrgGraphQL(
  orgName: string,
  token: string,
  onApiCall?: () => void,
): Promise<GraphQLOrgResult> {
  onApiCall?.();
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: GQL_QUERY, variables: { login: orgName } }),
  });

  if (!res.ok) throw new Error(`GraphQL error: ${res.status}`);

  const json = await res.json() as { data?: GraphQLOrgResult; errors?: Array<{message: string}> };
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');

  return json.data!;
}

// ── Repo Health ───────────────────────────────────────────────────────────────

export function getRepoHealth(repo: RepoData): RepoHealth {
  if (repo.archived) return 'dead';
  const pushedAt = new Date(repo.pushed_at).getTime();
  const daysSincePush = (Date.now() - pushedAt) / (1000 * 60 * 60 * 24);
  if (daysSincePush < 90) return 'active';
  if (daysSincePush < 365) return 'stale';
  return 'dead';
}

// ── Contributors ──────────────────────────────────────────────────────────────

export async function fetchOrgContributors(
  orgName: string,
  token: string,
  repos: RepoData[],
  onApiCall?: () => void,
): Promise<FetchResult<Contributor[]>> {
  const key = cacheKey.contributors(orgName);
  const cached = await getCache<Contributor[]>(key);
  if (cached) return { data: cached, fromCache: true };

  // Take top 50 repos by stars for a more comprehensive network
  const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 50);

  const contributorMap = new Map<string, Contributor>();

  // Process in chunks of 5 to avoid GitHub secondary rate limits
  for (let i = 0; i < topRepos.length; i += 5) {
    const chunk = topRepos.slice(i, i + 5);
    await Promise.all(
      chunk.map(async (repo) => {
        try {
          interface GHContributor { login: string; avatar_url: string; html_url: string; contributions: number }
          const list = await ghFetch<GHContributor[]>(
            `/repos/${orgName}/${repo.name}/contributors?per_page=30&anon=0`,
            token,
            onApiCall,
          );
          list.forEach((c) => {
            if (c.login.includes('[bot]')) return;
            const existing = contributorMap.get(c.login);
            if (existing) {
              existing.contributions += c.contributions;
              existing.repos.push(repo.name);
            } else {
              contributorMap.set(c.login, {
                login: c.login,
                avatar_url: c.avatar_url,
                html_url: c.html_url,
                contributions: c.contributions,
                repos: [repo.name],
              });
            }
          });
        } catch {
          // skip repos that block contributor access
        }
      })
    );
  }

  const data = Array.from(contributorMap.values())
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, 150);

  await setCache(key, data, TTL_CONTRIBUTORS);
  return { data, fromCache: false };
}

// ── Activity (Search API) ─────────────────────────────────────────────────────

interface SearchResult { total_count: number; items: Array<{ created_at: string; pull_request?: unknown }> }

function monthKey(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export async function fetchOrgActivity(
  orgName: string,
  token: string,
  repos: RepoData[],
  onApiCall?: () => void,
): Promise<FetchResult<OrgActivity>> {
  const key = cacheKey.activity(orgName);
  const cached = await getCache<OrgActivity>(key);
  if (cached) return { data: cached, fromCache: true };

  // Build last-7-month buckets
  const now = new Date();
  const buckets: Record<string, ActivityMonth> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = monthKey(d);
    buckets[mk] = { month: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), commits: 0, prs: 0, issues: 0 };
  }

  // Fetch PRs and issues from Search API (one call each)
  const since = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

  interface SearchIssue { created_at: string; pull_request?: unknown }
  const [prResult, issueResult] = await Promise.all([
    ghFetch<SearchResult>(
      `/search/issues?q=org:${orgName}+type:pr+created:>=${since.slice(0, 10)}&per_page=100&sort=created`,
      token, onApiCall,
    ).catch(() => ({ total_count: 0, items: [] as SearchIssue[] })),
    ghFetch<SearchResult>(
      `/search/issues?q=org:${orgName}+type:issue+created:>=${since.slice(0, 10)}&per_page=100&sort=created`,
      token, onApiCall,
    ).catch(() => ({ total_count: 0, items: [] as SearchIssue[] })),
  ]);

  prResult.items.forEach((item) => {
    const mk = monthKey(new Date(item.created_at));
    if (buckets[mk]) buckets[mk]!.prs++;
  });

  issueResult.items.forEach((item) => {
    const mk = monthKey(new Date(item.created_at));
    if (buckets[mk]) buckets[mk]!.issues++;
  });

  // Derive commit proxy from repos pushed_at within each month window
  repos.forEach((repo) => {
    const pushed = new Date(repo.pushed_at);
    const mk = monthKey(pushed);
    if (buckets[mk]) buckets[mk]!.commits += 1;
  });

  const months = Object.values(buckets);
  const data: OrgActivity = {
    months,
    totalCommits: months.reduce((s, m) => s + m.commits, 0),
    totalPRs: prResult.total_count,
    totalIssues: issueResult.total_count,
  };

  await setCache(key, data, TTL_ACTIVITY);
  return { data, fromCache: false };
}

// ── Per-Repo Detail ───────────────────────────────────────────────────────────

// Shape returned by /stats/commit_activity (last 52 weeks, ALL commits including anonymous)
interface GHCommitActivity {
  days: number[];
  total: number;
  week: number; // Unix timestamp of the Sunday starting the week
}

export async function fetchRepoDetail(
  orgName: string,
  repoName: string,
  token: string,
  onApiCall?: () => void,
): Promise<RepoDetailData> {
  const key = cacheKey.repoDetail(orgName, repoName);
  const cached = await getCache<RepoDetailData>(key);
  // Only return cache when it has real commit data (not a 202-empty placeholder)
  if (cached && cached.commitWeeks.length > 0) return cached;

  const [contributors, commitActivity, languages] = await Promise.all([
    ghFetch<RepoContributor[]>(
      `/repos/${orgName}/${repoName}/contributors?per_page=30&anon=0`,
      token, onApiCall,
    ).catch(() => [] as RepoContributor[]),
    // /stats/commit_activity gives last 52 weeks of ALL commits (including anonymous/unlinked).
    // This matches GitHub's own "Commits over the last year" chart exactly.
    // Returns 202 while GitHub computes — ghFetchStats retries automatically.
    ghFetchStats<GHCommitActivity[]>(
      `/repos/${orgName}/${repoName}/stats/commit_activity`,
      token, onApiCall,
    ),
    ghFetch<Record<string, number>>(
      `/repos/${orgName}/${repoName}/languages`,
      token, onApiCall,
    ).catch(() => ({} as Record<string, number>)),
  ]);

  // /stats/commit_activity returns 52 weekly totals — filter weeks with zero commits
  let commitWeeks: RepoCommitWeek[] = [];
  if (Array.isArray(commitActivity) && commitActivity.length > 0) {
    commitWeeks = (commitActivity as GHCommitActivity[])
      .filter((w) => w.total > 0)
      .map((w) => ({ week: w.week, total: w.total, days: w.days }));
  }

  const data: RepoDetailData = {
    contributors: Array.isArray(contributors)
      ? (contributors as RepoContributor[]).filter((c) => !c.login.includes('[bot]')).slice(0, 30)
      : [],
    commitWeeks,
    languages: languages && typeof languages === 'object' && !Array.isArray(languages)
      ? (languages as Record<string, number>)
      : {},
  };

  // Only cache when we have real commit data (skip caching 202-empty results)
  if (data.commitWeeks.length > 0 || data.contributors.length > 0) {
    await setCache(key, data, TTL_REPO_DETAIL);
  }
  return data;
}
