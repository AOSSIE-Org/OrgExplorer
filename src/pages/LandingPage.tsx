import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchOrganization,
  searchOrganizations,
  type OrgSearchItem,
} from "../api/github";

export function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OrgSearchItem[] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setError("Enter an organization name or login.");
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await searchOrganizations(q);
      if (data.items.length > 0) {
        setResults(data.items);
        if (data.items.length === 1) {
          navigate(`/org/${data.items[0].login}`);
        }
        return;
      }

      await fetchOrganization(q);
      navigate(`/org/${q}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function openOrg(login: string) {
    navigate(`/org/${login}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-14 sm:py-20">
      <header className="mb-10 text-center">
        
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          OrgExplorer
        </h1>
        <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
          Search public GitHub organizations by name or handle. Open a profile
          for a quick summary.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        role="search"
        className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 shadow-xl shadow-black/20 ring-1 ring-white/5 backdrop-blur-md"
      >
        <label className="sr-only" htmlFor="org-search">
          Organization search
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            id="org-search"
            type="search"
            name="q"
            placeholder="Try aossie, vercel, mozilla…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            className="min-h-11 flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div
          className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {results && results.length > 1 && (
        <section className="mt-10" aria-label="Matching organizations">
          <h2 className="mb-4 text-sm font-medium text-zinc-500">
            Pick an organization
          </h2>
          <ul className="flex flex-col gap-2">
            {results.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => openOrg(org.login)}
                  className="flex w-full items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left transition hover:border-emerald-500/40 hover:bg-zinc-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  <img
                    src={org.avatar_url}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-xl border border-zinc-700/50"
                  />
                  <div className="min-w-0">
                    <span className="block truncate font-semibold text-zinc-100">
                      {org.login}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Organization on GitHub
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
