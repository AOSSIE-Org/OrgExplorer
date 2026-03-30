import type { Repo } from "../types/github";

export const mergeRepos = (allRepos: Repo[][]): Repo[] => {
  const map = new Map<number, Repo>();

  allRepos.flat().forEach(repo => {
    if (!map.has(repo.id)) {
      map.set(repo.id, repo);
    }
  });

  return Array.from(map.values());
};