import tokenService from "./tokenService";
import githubService from "./githubService";
import cacheService from "./cacheService";

const { fetchOrgRepos } = githubService;
const { saveRepos, getRepos } = cacheService;

export {
  tokenService,
  githubService,
  cacheService,
  fetchOrgRepos,
  saveRepos,
  getRepos
};
