import React, { useState } from "react"
import { tokenService, githubService } from "../services"
// funtion to accept PAT and organisation name
export default function TestServices() {
  const [tokenInput, setTokenInput] = useState("")
  const [orgInput, setOrgInput] = useState("")

  const testFlow = async () => {
    if (!tokenInput) {
      alert("Please enter GitHub token")
      return
    }

    if (!orgInput) {
      alert("Please enter organization name")
      return
    }

    tokenService.setToken(tokenInput)
// funtion which fetches org repos is called
    try {
      const repos = await githubService.fetchOrgReposWithCache(
        orgInput,
        tokenInput
      )

      console.log("Repos count:", repos.length)
      console.log("Repo names:")
      repos.forEach(repo => console.log(repo.name))

    } catch (error) {
      console.error("Error:", error)
      alert("Failed to fetch repositories");
      
    }
  }
// input fileds to enter PAT and org name
  return (
    <div style={{ padding: "1rem" }}>
      <input
        type="password"
        placeholder="Enter GitHub PAT"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
      />

      <input
        type="text"
        placeholder="Enter organization name"
        value={orgInput}
        onChange={(e) => setOrgInput(e.target.value)}
        style={{ marginLeft: "10px" }}
      />

      <button onClick={testFlow} style={{ marginLeft: "10px" }}>
        Test Services
      </button>
    </div>
  )
} 