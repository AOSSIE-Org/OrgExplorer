import { useState } from "react";
import "./App.css";

function App() {
  const [org, setOrg] = useState("");
  const [orgData, setOrgData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrg = async () => {
    if (!org) return;

    setLoading(true);
    setError("");
    setOrgData(null);

    try {
      const res = await fetch(`https://api.github.com/orgs/${org}`);
      if (!res.ok) {
        throw new Error("Organization not found");
      }
      const data = await res.json();
      setOrgData(data);
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>OrgExplorer</h1>

      <input
        type="text"
        placeholder="Enter GitHub org (e.g. google)"
        value={org}
        onChange={(e) => setOrg(e.target.value)}
        style={{ padding: "10px", width: "250px", marginRight: "10px" }}
      />

      <button onClick={fetchOrg} style={{ padding: "10px" }}>
        Search
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {orgData && (
        <div style={{ marginTop: "20px" }}>
          <img src={orgData.avatar_url} width="100" />
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