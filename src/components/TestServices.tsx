import React from "react";
import { tokenService, githubService } from "../services";

export default function TestServices() {

  const testFlow = async () => {
    tokenService.setToken("GITHUB-TOKEN");

    const token = tokenService.getToken();

    if (!token) {
      console.error("Token is not set!");
      return;
    }

    const org = prompt("Enter org name:");

      if (!org) return;

      const repos = await githubService.fetchOrgReposWithCache(org, token);

    console.log("Repos count:", repos.length);
    console.log("Repo names:");
    repos.forEach(repo => console.log(repo.name));
  };

  return (
    <button onClick={testFlow}>
      Test Services
    </button>
  );
}