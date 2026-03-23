import { useState, type FormEvent } from "react";
import "./App.css";
import { getOrganization, refreshOrganization } from "./cache/orgCache";
import type { OrgResult } from "./api/github";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<OrgResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const org = await getOrganization(query);
      setResult(org);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to fetch organization.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!result) return;
    setRefreshing(true);
    setError(null);
    try {
      const refreshed = await refreshOrganization(result.org.login);
      setResult(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh organization.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app">
      <section className="panel">
        <h1 className="title">Org Explorer</h1>
        <p className="subtitle">
          Search a GitHub organization and cache results with TTL + IndexedDB.
        </p>

        <form className="searchForm" onSubmit={handleSearch}>
          <input
            className="searchInput"
            placeholder="Enter organization login, e.g. github"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || refreshing}
          />
          <button className="button primary" type="submit" disabled={loading || refreshing}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <article className="card">
            <div className="cardHeader">
              <img className="avatar" src={result.org.avatar_url} alt="" />
              <div>
                <h2>{result.org.name || result.org.login}</h2>
                <p className="handle">@{result.org.login}</p>
              </div>
            </div>

            {result.org.description && <p className="description">{result.org.description}</p>}

            <dl className="stats">
              <div>
                <dt>Public repos</dt>
                <dd>{result.org.public_repos.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>{result.org.followers.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(result.org.created_at)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{result.source === "cache" ? "Cache (IndexedDB)" : "GitHub API"}</dd>
              </div>
            </dl>

            <p className="meta">
              Last fetched: {new Date(result.cachedAt).toLocaleTimeString()}
            </p>

            <div className="actions">
              <a className="button ghost" href={result.org.html_url} target="_blank" rel="noreferrer">
                Open on GitHub
              </a>
              <button
                className="button primary"
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh data"}
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export default App;
