import { useRef, useState } from "react";

type GitHubOrg = {
  avatar_url: string;
  login: string;
  description: string | null;
  followers: number;
  public_repos: number;
};

function App() {
  const [org, setOrg] = useState("");
  const [orgData, setOrgData] = useState<GitHubOrg | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchOrg = async () => {
    const orgName = org.trim();

    // ✅ handle empty input properly
    if (!orgName) {
      abortRef.current?.abort();
      setLoading(false);
      setError("");
      setOrgData(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setOrgData(null);

    try {
      const res = await fetch(
        `https://api.github.com/orgs/${encodeURIComponent(orgName)}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        throw new Error("Organization not found");
      }

      const data = await res.json();
      setOrgData(data as GitHubOrg);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch organization");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>OrgExplorer</h1>

      {/* ✅ Accessible Label */}
      <label htmlFor="org-input" style={{ position: "absolute", left: "-9999px" }}>
        GitHub organization
      </label>

      {/* ✅ Input */}
      <input
        id="org-input"
        type="text"
        placeholder="Enter GitHub org (e.g. google)"
        value={org}
        onChange={(e) => setOrg(e.target.value)}
        style={{ padding: "10px", width: "250px", marginRight: "10px" }}
      />

      {/* ✅ Button */}
      <button onClick={fetchOrg} style={{ padding: "10px" }}>
        Search
      </button>

      {/* ✅ Loading & Error */}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ✅ Data Display */}
      {orgData && (
        <div style={{ marginTop: "20px" }}>
          <img
            src={orgData.avatar_url}
            width="100"
            alt={`${orgData.login} avatar`}
          />
          <h2>{orgData.login}</h2>
          <p>{orgData.description}</p>
          <p>Followers: {orgData.followers}</p>
          <p>Public Repos: {orgData.public_repos}</p>
        </div>
      )}
    </div>
  );
}

export default App;
