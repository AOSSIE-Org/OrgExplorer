/**
 * Service for interacting with the GitHub API.
 * 
 * TODO: Mentors are discussing future service improvements.
 */
import cacheService from "./cacheService";

const GITHUB_API_URL = 'https://api.github.com';

const githubService = {

  async fetchOrgRepos(org: string, token: string): Promise<any[]> {
    try {
      console.log("Fetching from:", `${GITHUB_API_URL}/orgs/${org}/repos`);

      const response = await fetch(`${GITHUB_API_URL}/orgs/${org}/repos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
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
    // Step 1: Check cache
    const cachedRepos = await cacheService.getRepos(org);

    if (cachedRepos) {
      console.log("Using cached repos");
      return cachedRepos;
    }

    // Step 2: Fetch from GitHub
    const repos = await this.fetchOrgRepos(org, token);

    // Step 3: Save to cache
    await cacheService.saveRepos(org, repos);

    return repos;
  }

}
export default githubService;