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