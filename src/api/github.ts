const API_BASE = "https://api.github.com";
const RATE_LIMIT_KEY = "org-explorer:rate-limit";
const REQUEST_TIMEOUT_MS = 15_000;

export interface GitHubOrg {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  location: string | null;
  blog: string | null;
  description: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface OrgResult {
  org: GitHubOrg;
  source: "cache" | "network";
  cachedAt: number;
}

interface RateLimitWindow {
  blockedUntil: number;
  remaining: number | null;
}

function getRateLimitWindow(): RateLimitWindow | null {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RateLimitWindow;
  } catch {
    return null;
  }
}

function setRateLimitWindow(headers: Headers) {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (!remaining || !reset) return;

  const remainingNum = Number(remaining);
  const resetEpochMs = Number(reset) * 1000;
  if (Number.isNaN(remainingNum) || Number.isNaN(resetEpochMs)) return;

  const value: RateLimitWindow = {
    remaining: remainingNum,
    blockedUntil: remainingNum <= 0 ? resetEpochMs : 0,
  };
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(value));
  } catch {
    // Best-effort only: cache persistence must never break API flow.
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.message === "string") return body.message;
  } catch {
    // ignore parse issues and fall back to status text
  }
  return response.statusText || `Request failed (${response.status})`;
}

function getRateLimitGuardError(): string | null {
  const rateLimit = getRateLimitWindow();
  if (!rateLimit || !rateLimit.blockedUntil) return null;
  if (Date.now() >= rateLimit.blockedUntil) return null;

  const waitMinutes = Math.max(
    1,
    Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000),
  );
  return `GitHub rate limit reached. Try again in about ${waitMinutes} minute(s), or use refresh later.`;
}

export async function getOrganizationFromGitHub(
  login: string,
): Promise<GitHubOrg> {
  const rateLimitError = getRateLimitGuardError();
  if (rateLimitError) throw new Error(rateLimitError);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/orgs/${encodeURIComponent(login)}`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  setRateLimitWindow(response.headers);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as GitHubOrg;
}
