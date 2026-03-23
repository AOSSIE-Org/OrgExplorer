import { useState, type FormEvent } from "react";
import "./App.css";
import { getOrganization, refreshOrganization } from "./cache/orgCache";
import type { OrgResult } from "./api/github";
import { uiText } from "./i18n/strings";

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
      setError(err instanceof Error ? err.message : uiText.fetchErrorFallback);
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
      setError(err instanceof Error ? err.message : uiText.refreshErrorFallback);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app">
      <section className="panel">
        <h1 className="title">{uiText.appTitle}</h1>
        <p className="subtitle">{uiText.appSubtitle}</p>

        <form className="searchForm" onSubmit={handleSearch}>
          <label htmlFor="org-login" className="srOnly">
            {uiText.searchLabel}
          </label>
          <input
            id="org-login"
            className="searchInput"
            placeholder={uiText.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || refreshing}
          />
          <button className="button primary" type="submit" disabled={loading || refreshing}>
            {loading ? uiText.searchLoading : uiText.searchIdle}
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
                <dt>{uiText.publicRepos}</dt>
                <dd>{result.org.public_repos.toLocaleString()}</dd>
              </div>
              <div>
                <dt>{uiText.followers}</dt>
                <dd>{result.org.followers.toLocaleString()}</dd>
              </div>
              <div>
                <dt>{uiText.created}</dt>
                <dd>{formatDate(result.org.created_at)}</dd>
              </div>
              <div>
                <dt>{uiText.source}</dt>
                <dd>{result.source === "cache" ? uiText.sourceCache : uiText.sourceApi}</dd>
              </div>
            </dl>

            <p className="meta">
              {uiText.lastFetched}: {new Date(result.cachedAt).toLocaleTimeString()}
            </p>

            <div className="actions">
              <a className="button ghost" href={result.org.html_url} target="_blank" rel="noreferrer">
                {uiText.openGitHub}
              </a>
              <button
                className="button primary"
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                {refreshing ? uiText.refreshLoading : uiText.refreshIdle}
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export default App;
