import cacheService from "./cacheService";
import type { GitHubRepo } from "./cacheService"
const GITHUB_API_URL = 'https://api.github.com';

const githubService = {
  

  async fetchOrgRepos(org: string, token: string): Promise<GitHubRepo[]> {
    try {
      const url = `${GITHUB_API_URL}/orgs/${org}/repos`;
      console.log("Fetching from:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        }
      });

     if (!response.ok) {
  if (response.status === 401) {
    throw new Error("Invalid or expired GitHub token. Please check your PAT.");
  }

  if (response.status === 403) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (response.status === 404) {
    throw new Error("Organization not found.");
  }

  throw new Error(
    `GitHub API error: ${response.status} ${response.statusText}`
  );
}

      return await response.json();

    } catch (error) {
  console.error(
    `Error fetching repositories for organization ${org}:`,
    error
  )

  // Re-throw so UI layer can handle it
  throw error instanceof Error
    ? error
    : new Error("Something went wrong")
}
  },

  async fetchOrgReposWithCache(org: string, token: string): Promise<GitHubRepo[]> {

    // Step 1: Check IDB cache
  let cachedRepos = null

  try {
    cachedRepos = await cacheService.getRepos(org)
  } catch (err) {
    console.warn("Cache read failed. Falling back to network.", err)
    cachedRepos = null
  }

  if (cachedRepos) {
    console.log("Using cached repos")
    return cachedRepos
  }

    // Step 2: Fetch from GitHub
    const repos = await this.fetchOrgRepos(org, token);

    // Step 3: Save structured cache
    cacheService
  .saveRepos(org, {
    data: repos,
    savedAt: Date.now()
  })
  .catch((err) => {
    console.warn("Cache save failed:", err)
  })
    return repos;
  }

};

export default githubService;