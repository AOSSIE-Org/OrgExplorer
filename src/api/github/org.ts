import { githubRequest } from "./client";

export function fetchOrg(org:string) {
  return githubRequest(`/orgs/${org}`);
}


export function fetchOrgRepos(org:string) {
  return githubRequest(`/orgs/${org}/repos?per_page=100`);
}

