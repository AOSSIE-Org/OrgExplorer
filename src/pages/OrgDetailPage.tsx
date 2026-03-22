import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchOrganization, type GitHubOrg } from "../api/github";

const backBtnClass =
  "inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

function BackToSearch() {
  const navigate = useNavigate();
  return (
    <div className="mb-8">
      <button type="button" onClick={() => navigate("/")} className={backBtnClass}>
        ← Back to search
      </button>
    </div>
  );
}

function formatDate(iso: string) {
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

function OrgDetailInner({ login }: { login: string }) {
  const [org, setOrg] = useState<GitHubOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchOrganization(login)
      .then((data) => {
        if (!cancelled) {
          setOrg(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load organization.",
          );
          setOrg(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [login]);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
      <BackToSearch />

      {loading && (
        <div
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 py-12 text-center text-sm text-zinc-500"
          aria-live="polite"
        >
          Loading organization…
        </div>
      )}

      {!loading && error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && org && (
        <article className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-2xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-md">
          <div className="border-b border-zinc-800/80 bg-gradient-to-br from-emerald-500/10 via-zinc-900/50 to-transparent p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <img
                src={org.avatar_url}
                alt=""
                width={96}
                height={96}
                className="size-24 shrink-0 rounded-2xl border border-zinc-700/50 shadow-lg sm:size-28"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {org.name || org.login}
                </h1>
                <p className="mt-1 font-medium text-emerald-400/90">
                  @{org.login}
                </p>
                {org.description && (
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                    {org.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr] sm:p-8">
            {org.location && (
              <>
                <dt className="font-medium text-zinc-500">Location</dt>
                <dd className="text-zinc-200">{org.location}</dd>
              </>
            )}
            {org.blog && (
              <>
                <dt className="font-medium text-zinc-500">Website</dt>
                <dd>
                  <a
                    href={
                      org.blog.startsWith("http")
                        ? org.blog
                        : `https://${org.blog}`
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                  >
                    {org.blog}
                  </a>
                </dd>
              </>
            )}
            {org.twitter_username && (
              <>
                <dt className="font-medium text-zinc-500">X / Twitter</dt>
                <dd>
                  <a
                    href={`https://twitter.com/${org.twitter_username}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
                  >
                    @{org.twitter_username}
                  </a>
                </dd>
              </>
            )}
            <dt className="font-medium text-zinc-500">Public repositories</dt>
            <dd className="tabular-nums text-zinc-200">
              {org.public_repos.toLocaleString()}
            </dd>
            <dt className="font-medium text-zinc-500">Followers</dt>
            <dd className="tabular-nums text-zinc-200">
              {org.followers.toLocaleString()}
            </dd>
            <dt className="font-medium text-zinc-500">Created</dt>
            <dd className="text-zinc-200">{formatDate(org.created_at)}</dd>
          </dl>

          <div className="border-t border-zinc-800/80 p-6 sm:px-8 sm:pb-8">
            <a
              href={org.html_url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              View on GitHub
            </a>
          </div>
        </article>
      )}
    </div>
  );
}

export function OrgDetailPage() {
  const { login: loginParam } = useParams<{ login: string }>();
  const login = loginParam?.trim() ?? "";

  if (!login) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
        <BackToSearch />
        <div
          className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Missing organization.
        </div>
      </div>
    );
  }

  return <OrgDetailInner key={login} login={login} />;
}
