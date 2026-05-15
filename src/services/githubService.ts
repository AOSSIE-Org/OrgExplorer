const BASE = "https://api.github.com";

const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export const fetchOrgRepos = async (org: string) => {
  const res = await fetch(`${BASE}/orgs/${org}/repos?per_page=100`, {
    headers: {
      Authorization: `token ${TOKEN}`
    }
  });

  if (!res.ok) throw new Error("API Error");
  return res.json();
};

export const fetchRepoContributors = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${TOKEN}`
    }
  });

  if (!res.ok) throw new Error("Contributor API Error");
  return res.json();
};

export const fetchRepoIssues = async (owner: string, repo: string) => {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
    {
      headers: {
        Authorization: `token ${TOKEN}`
      }
    }
  );

  if (!res.ok) throw new Error("Issues API Error");
  return res.json();
};

// Fetch PRs of repo
export const fetchRepoPRs = async (owner: string, repo: string) => {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
    {
      headers: { Authorization: `token ${TOKEN}` }
    }
  );

  if (!res.ok) return [];
  return res.json();
};

