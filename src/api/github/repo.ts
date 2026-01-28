import { githubRequest } from "./client";

export function fetchRepoContributors(owner: string, repo: string) {
  return githubRequest(`/repos/${owner}/${repo}/contributors`);
}
