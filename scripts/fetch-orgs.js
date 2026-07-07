import fs from 'fs';
import path from 'path';

const ORGS = ['AOSSIE-Org', 'DjedAlliance', 'StabilityNexus'];
const MAX_REPO_PAGES = 5; // Up to 500 repositories per organization
const TOP_REPOS_LIMIT = 10; // Contributors/issues fetched for top N repositories
const MAX_ISSUE_PAGES = 3; // Up to 300 issues per repository for trends/governance

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const headers = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'OrgExplorer-Cache-Builder'
};

if (GITHUB_TOKEN) {
  headers.Authorization = `token ${GITHUB_TOKEN}`;
  console.log('Using GITHUB_TOKEN for authenticated API requests.');
} else {
  console.log('Running unauthenticated (subject to lower rate limits).');
}

// Helper to make fetch calls with retries / error checks
async function fetchWithRetry(url) {
  const res = await fetch(url, { headers });
  if (res.status === 403) {
    const rateLimitReset = res.headers.get('x-ratelimit-reset');
    const resetTime = rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toLocaleString() : 'unknown';
    throw new Error(`GitHub API rate limit exceeded. Reset at: ${resetTime}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${res.statusText} at ${url}`);
  }
  return res.json();
}

// Re-implementation of getTopRepositories from analytics.js
function getTopRepositories(repos, limit = 10) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return [...repos]
    .map(repo => {
      const pushedAtMs = Date.parse(repo.pushed_at);  
      const daysSinceLastPush = Number.isFinite(pushedAtMs) ? (Date.now() - pushedAtMs) / MS_PER_DAY : Infinity;
      const activityBonus = 0.5 * Math.max(0, 365 - daysSinceLastPush);
      const score =  
        (repo.stargazers_count ?? 0) +  
        (repo.forks_count ?? 0) * 2 +  
        (repo.watchers_count ?? 0) * 1.5 +  
        activityBonus;  
      return {
        ...repo,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Fetch all repositories for an organization
async function fetchAllRepos(org) {
  const all = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`;
    console.log(`  Fetching repos page ${page}...`);
    const data = await fetchWithRetry(url);
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

// Fetch contributors for a repository
async function fetchRepoContributors(org, repo) {
  const all = [];
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/contributors?per_page=100&page=${page}`;
    const data = await fetchWithRetry(url);
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

// Fetch issues for a repository
async function fetchRepoIssues(org, repo) {
  const all = [];
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all&per_page=100&page=${page}`;
    const data = await fetchWithRetry(url);
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

async function run() {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const orgsDir = path.join(dataDir, 'orgs');

  // Ensure directories exist
  fs.mkdirSync(orgsDir, { recursive: true });

  console.log(`Starting fetch for organizations: ${ORGS.join(', ')}`);

  const manifestOrgs = [];

  for (const orgName of ORGS) {
    try {
      console.log(`\nProcessing organization: ${orgName}`);
      
      console.log(`  Fetching metadata...`);
      const orgData = await fetchWithRetry(`https://api.github.com/orgs/${orgName}`);
      
      const allRepos = await fetchAllRepos(orgName);
      console.log(`  Total repos fetched: ${allRepos.length}`);

      const topRepos = getTopRepositories(allRepos, TOP_REPOS_LIMIT);
      console.log(`  Identified top ${topRepos.length} repos for contributors & issues.`);

      const contributors = {};
      const issues = {};

      for (const repo of topRepos) {
        console.log(`    Fetching data for repo: ${repo.name}`);
        try {
          contributors[repo.name] = await fetchRepoContributors(orgName, repo.name);
          console.log(`      Contributors fetched: ${contributors[repo.name].length}`);
        } catch (err) {
          console.error(`      Failed to fetch contributors for ${repo.name}: ${err.message}`);
          contributors[repo.name] = [];
        }

        try {
          issues[repo.name] = await fetchRepoIssues(orgName, repo.name);
          console.log(`      Issues fetched: ${issues[repo.name].length}`);
        } catch (err) {
          console.error(`      Failed to fetch issues for ${repo.name}: ${err.message}`);
          issues[repo.name] = [];
        }
      }

      const combinedData = {
        org: orgData,
        repos: allRepos,
        contributors,
        issues
      };

      const orgFilePath = path.join(orgsDir, `${orgName.toLowerCase()}.json`);
      fs.writeFileSync(orgFilePath, JSON.stringify(combinedData, null, 2));
      console.log(`  Saved cached JSON to ${orgFilePath}`);

      manifestOrgs.push({
        login: orgName.toLowerCase(),
        name: orgName
      });

    } catch (err) {
      console.error(`Error processing organization ${orgName}: ${err.message}`);
    }
  }

  // Save manifest
  const manifest = {
    updatedAt: new Date().toISOString(),
    orgs: manifestOrgs
  };
  const manifestPath = path.join(dataDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nSaved manifest to ${manifestPath}`);
  console.log('Caching script finished successfully.');
}

run().catch(err => {
  console.error('Fatal error in caching script:', err);
  process.exit(1);
});
