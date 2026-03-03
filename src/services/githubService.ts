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
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`Error fetching repositories for organization ${org}:`, error);
      throw error;
    }
  },

  async fetchOrgReposWithCache(org: string, token: string): Promise<any[]> {

    // Step 1: Check IDB cache
    const cachedRepos = await cacheService.getRepos(org);

    if (cachedRepos) {
      console.log("Using cached repos");
      return cachedRepos;
    }

    // Step 2: Fetch from GitHub
    const repos = await this.fetchOrgRepos(org, token);

    // Step 3: Save structured cache
    await cacheService.saveRepos(org, {
      data: repos,
      savedAt: Date.now()
    });

    return repos;
  }

};

export default githubService;