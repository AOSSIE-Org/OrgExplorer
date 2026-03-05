import { useState } from "react"
import { tokenService, githubService } from "../services"
// funtion to accept PAT and organisation name
export default function TestServices() {
  const [tokenInput, setTokenInput] = useState("")
  const [orgInput, setOrgInput] = useState("")

  const testFlow = async () => {

    const trimmedToken = tokenInput.trim()
const trimmedOrg = orgInput.trim()

if (!trimmedToken) {
  alert("Please enter GitHub token")
  return
}

if (!trimmedOrg) {
  alert("Please enter organization name")
  return
}

tokenService.setToken(trimmedToken)
// funtion which fetches org repos is called
    try {
      const repos = await githubService.fetchOrgReposWithCache(
        trimmedOrg,
        trimmedToken
      )

      console.log("Repos count:", repos.length)
      console.log("Repo names:")
      repos.forEach(repo => console.log(repo.name))

    } catch (error) {
  console.error("Error:", error)

  if (error instanceof Error) {
    alert(error.message)
  } else {
    alert("Failed to fetch repositories")
  }
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

      <button type='button' onClick={testFlow} style={{ marginLeft: "10px" }}>
        Test Services
      </button>
    </div>
  )
} 