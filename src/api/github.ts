const API = "https://api.github.com";

export interface OrgSearchItem {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface OrgSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: OrgSearchItem[];
}

export interface GitHubOrg {
  login: string;
  id: number;
  node_id: string;
  url: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  description: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  type: string;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.message === "string") return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || `Request failed (${res.status})`;
}

export async function searchOrganizations(
  query: string,
): Promise<OrgSearchResult> {
  const q = `${query.trim()} in:login type:org`.replace(/\s+/g, " ");
  const url = `${API}/search/users?q=${encodeURIComponent(q)}&per_page=20`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<OrgSearchResult>;
}

export async function fetchOrganization(login: string): Promise<GitHubOrg> {
  const res = await fetch(`${API}/orgs/${encodeURIComponent(login.trim())}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<GitHubOrg>;
}
