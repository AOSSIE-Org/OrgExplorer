# AGENTS.md

This file gives AI coding agents (Claude, Copilot, Cursor, etc.) the context needed
to work on OrgExplorer without re-deriving architecture from scratch. Read this
before making changes.

## What this project is

OrgExplorer is a dashboard for exploring GitHub organizations — repositories,
contributors, governance health, network graphs, and activity trends. It's a
React + Vite frontend that talks directly to the GitHub REST API from the
browser (no backend server).

## Project Philosophy

This project originates from AOSSIE's GSoC idea proposal (see
[https://github.com/AOSSIE-Org/OrgExplorer]), which set three hard requirements:

- No backend — must run entirely in the browser.
- Local storage / IndexedDB only for persistence.
- Aggressive local caching to avoid exceeding GitHub API limits.

Everything else in this codebase is downstream of those three constraints.
OrgExplorer prioritizes:

1. **GitHub API efficiency over completeness when unauthenticated.** Standard
   mode exists because the app has no server to proxy requests through or
   hide a shared token behind — every unauthenticated visitor shares GitHub's
   60 req/hr limit individually. Scoping to top-10-per-org is a deliberate
   trade-off, not a shortcut to remove later.
2. **Browser-only architecture (no backend).** Do not introduce a server,
   serverless function, or proxy to work around rate limits or CORS — solve
   it client-side (PAT support, caching, batching) or don't solve it.
3. **Derived analytics instead of raw GitHub listings.** Prefer computing a
   health score, ranking, or trend over just displaying a raw API response.
   The value of this app is the synthesis, not the listing.
4. **Deterministic and explainable metrics.** Every score (health score,
   repo ranking, bus factor, etc.) should be traceable to a documented
   formula — no black-box weighting, no randomness, no metric a user can't
   get an explanation for via a "Learn More"-style modal.
5. **Fast repeat visits through aggressive caching.** IndexedDB caching
   (`services/cache.js`, 1hr TTL) exists specifically so a user re-opening
   the same org doesn't re-spend their rate limit. Any new fetch path should
   go through `fetchWithCache`, not a raw `fetch()`.

When multiple implementations are possible, prefer the one that minimizes
API requests while keeping analytics deterministic.

## Existing Libraries

React, Vite, TailwindCSS, Recharts, D3, React Router.

Prefer these existing libraries before introducing a new dependency. If you
believe a new library is genuinely needed, say so explicitly in the PR
description rather than adding it silently.

Note: `services/cache.js` uses the native browser `indexedDB` API directly
(not the `idb` npm wrapper). Do not add `idb` as a dependency to "simplify"
this — it would mean rewriting working, tested code for no functional gain.

## Core constraint: GitHub API rate limits

This shapes almost every architectural decision in the codebase. Unauthenticated
requests are capped at 60/hr; requests with a Personal Access Token (PAT) get
5,000/hr. Because of this, the app runs in one of two modes:

- **Standard mode (no PAT)** — analyzes a scoped-down subset of the org to stay
  within the unauthenticated limit.
- **Complete mode (PAT connected)** — analyzes the full org.

Every data-fetching function needs to respect this distinction. Do not add a
fetch that ignores the `pat` presence check.

## Repo-scoping rule (the most important pattern in this codebase)

```javascript
// services/analytics.js
export function getTopRepositories(repos, limit = 10) {
  // Score = stars + 2×forks + 1.5×watchers + recency bonus
  // (bonus decays linearly for repos not pushed to within the last year)
}
```

```javascript
// context/AppContext.jsx
const selectAnalysisRepos = useCallback((allRepos) => {
  const byOrg = {}
  for (const repo of allRepos) {
    (byOrg[repo.orgLogin] ??= []).push(repo)
  }
  return Object.values(byOrg).flatMap(orgRepos =>
    pat ? orgRepos : getTopRepositories(orgRepos, 10)
  )
}, [pat])
```

**Rule: without a PAT, only the top 10 repos per org (by this scoring formula)
are used for contributors, issues, and pull requests. With a PAT, all fetched
repos per org are used.**

If you add a new feature that fetches per-repo data (e.g. a new metric type),
it must go through `selectAnalysisRepos` (or an equivalent that applies the
same rule) — not `model.totalRepos` directly, and not a different top-N cutoff.
Inconsistent scoping across features is a recurring bug class in this repo;
see git history around "PR-metrics scoping" for a real example.

## Derived Metrics

- Health Score
- Activity Classification (repo-level; previously called "lifecycle" in
  some older code/tooltips — that naming is deprecated, use
  `activityClassification`)
- Bus Factor
- Contributor Freshness
- Issue Resolution Rate
- Cross-repo contributor signal

These metrics are deterministic — same inputs always produce the same
output, no randomness, no hidden weighting.

Never modify a metric's formula without updating both its documentation
here and every page that consumes it.

Note: if additional metrics exist in the codebase beyond this list, add them
here with their formula reference — don't let an agent infer meaning from
variable names alone.

## Stable Contracts

Unless explicitly requested, do not change:

- `fetchWithCache()`
- `buildAnalyticalModel()`
- `AppContext` state shape
- PAT save/load flow
- Cache TTL (1 hour)
- Health score formula
- `getTopRepositories()` / `selectAnalysisRepos()` scoring and scoping logic

These are load-bearing for every page in the app. A change here has a wide
blast radius — treat it as an architecture change, not a local fix.

## Fetch caps by data type

| Data | No PAT | With PAT |
|---|---|---|
| Repos fetched (`fetchRepos`) | ≤500/org (5 pages) | all repos/org (`Math.ceil(public_repos/100)` pages) |
| Repos used downstream | top 10/org | all fetched repos/org |
| Contributors/repo | ≤100 (1 page) | ≤1000 (10 pages) |
| Issues/repo | ≤100 (1 page) | ≤1000 (10 pages) |
| Pull Requests/repo | ≤100 (1 page) | ≤1000 (10 pages) |

These caps live in `services/github.js` inside each `fetchX` function as
`maxPages = pat ? 10 : 1` (or `5` for the initial repo list). Keep them
symmetric across `fetchContributors`, `fetchIssues`, and `fetchPulls` unless
there's a specific reason to diverge — they were intentionally aligned.

## State architecture (`context/AppContext.jsx`)

Single context provider (`AppProvider`) holds all cross-page state. Key pieces:

- **`model`** — built by `buildAnalyticalModel()`, contains `allRepos`
  (PAT-scoped, used for contributors) and `totalRepos` (raw, unscoped fetch —
  use this + `selectAnalysisRepos` for new per-repo fetches, not `allRepos`).
- **`isComplete`** — true once org metadata + all repos + all contributors are
  fetched (i.e. `explore()` ran with a PAT). Overview, Contributors,
  Repositories, and Network pages gate their "Run Complete Analysis" banner on
  this flag.
- **`auditComplete`** — true once issues are fetched for the full repo set.
  Used by the issue/governance side of Analytics and Governance pages.
- **`advanceAnalyticsComplete`** — same idea, for pull-request data.
- **`lastOrgNames`** — remembers the last searched org(s) so any page can
  re-trigger `explore()` without the user re-entering names.

## Entry points and when to use which

| Function | Fetches | Use when |
|---|---|---|
| `explore(orgNames)` | org metadata, repos, contributors | Initial search |
| `runFullExplore()` | same as `explore`, replays `lastOrgNames` | Any page's banner needs to (re-)run a full analysis |
| `runAudit()` | issues only, from current `model` | Rare — most callers should use `runGovernanceAnalysis` instead |
| `runGovernanceAnalysis()` | repos (if needed) + issues | Governance page trigger |
| `runAdvanceAnalytics()` | repos (if needed) + pulls | Analytics page (PR metrics) trigger, no-PAT case |
| `runFullAnalytics()` | repos (if needed) + issues + pulls (parallel) | Analytics page combined trigger, used once PAT is connected |

**Pattern to follow for any new "Run Complete Analysis" feature:**

```javascript
const runSomeNewAnalysis = useCallback(async () => {
  if (someLoadingFlag) return

  let currentModel = model
  if (!isComplete) {
    setSomeLoadingFlag(true)
    const freshModel = await runFullExplore()
    setSomeLoadingFlag(false)
    if (!freshModel) return
    currentModel = freshModel
  }

  if (!currentModel) return

  setSomeLoadingFlag(true)
  const repos = selectAnalysisRepos(currentModel.totalRepos)
  // ...fetch and process...
  setSomeLoadingFlag(false)
  setSomeCompleteFlag(!!pat)
}, [isComplete, model, runFullExplore, selectAnalysisRepos, pat, someLoadingFlag])
```

This avoids a real stale-closure bug that's bitten this codebase before: don't
read `model` from context state right after calling `runFullExplore()` — state
updates aren't synchronous, so use the model **returned** by the explore call
instead.

## `AnalysisBanner` component

Shared banner shown at the top of Overview, Repositories, Contributors,
Network, Governance, and Analytics. It:

- Shows "Standard" vs "Complete" status via an `analysisStatus` prop
  (`'standard' | 'complete'`).
- On click, checks if a PAT is saved; if not, opens `PATModal` instead of
  running anything.
- Calls the page's `onRun` callback (one of the `runX` functions above) once a
  PAT exists.

When adding this banner to a new page, wire `analysisStatus` to whichever
`*Complete` flag actually reflects that page's data — don't reuse
`isComplete` for pages whose data depends on a *later* fetch stage (issues,
pulls) that could still be standard-scoped even after `isComplete` is true.

## UI Guidelines

- Reuse existing shared components (`AnalysisBanner`, `PATModal`, card/stat
  components in `components/UI`) rather than building page-specific
  one-offs.
- Reuse existing skeleton loaders (e.g. `OverviewSkeleton`) rather than
  introducing a new loading pattern per page.
- Every page should account for all five states: loading, empty, error,
  standard mode, and complete mode. Don't ship a page that only handles the
  happy path.
- Loading checks must run before any early `return null` for missing data
  — see "Common bugs" below on hook ordering.

## Accessibility

Maintain across all UI work:

- Keyboard navigation for interactive elements (modals, dropdowns, buttons)
- Semantic HTML over div-soup where practical
- Visible focus states
- `aria-label`s on icon-only buttons
- Sufficient color contrast against the existing dark theme

Note: as of the current codebase, `PATModal` is missing dialog semantics
(`role="dialog"`, `aria-modal`, focus trap, Escape-to-close) — this is a
known gap, not a pattern to replicate in new modals.

## Security

Handling of the GitHub PAT:

- Never log the PAT, in console output, error messages, or analytics.
- Never send the PAT anywhere except directly to `api.github.com`.
- Never persist the PAT outside `localStorage` (no cookies, no query
  params, no external storage).
- Never expose the PAT in a URL, including in `Link` headers or debug
  output.

Note: the PAT is currently stored as plaintext in `localStorage`
(`oe_pat`), which is readable by any script able to execute in this origin.
This is a known, accepted trade-off for a backend-less app — do not "fix"
it by adding a server or remote storage without discussing it first, since
that would violate the no-backend requirement.

## Caching

`services/cache.js` wraps every GitHub request in an IndexedDB cache
(`fetchWithCache`), TTL 1 hour. Before adding a "refetch" trigger, check
whether the data is already cached — a complete-analysis re-run should not
redundantly refetch repos/contributors if `isComplete` is already `true`.

## Error Handling

GitHub API errors should always be classified into one of:

- Rate limit
- Network failure
- Authentication (invalid/expired PAT)
- Not Found
- Unknown

Never surface a raw GitHub API error message directly to the user — map it
to one of the categories above and show a clear, actionable message (see
the existing `RATE_LIMIT` handling in `explore()` for the pattern to follow).

## Common bugs seen in this codebase (avoid repeating them)

1. **Hooks after an early return.** Several pages do `if (!model) return null`
   near the top. Any `useMemo`/`useCallback`/custom hook must be called
   *before* that line, or React throws "Rendered fewer hooks than expected."
2. **Argument-order mismatches.** `fetchRepos(org, repoCount, pat)` has been
   miscalled as `fetchRepos(org.login, pat)` before, silently breaking PAT
   detection. Double-check parameter order against the function signature,
   not just the call site that "looks right."
3. **Clearing state synchronously at the start of a re-fetch.** `explore()`
   used to do `setModel(null)` immediately on every call, which unmounted
   pages guarded by `if (!model) return null` and caused a visible flicker.
   Prefer swapping state atomically once new data is ready, so the previous
   view stays visible during a refresh.
4. **Reusing standard-mode dropdowns/lists without checking what was actually
   fetched.** Derive UI lists (e.g. repo-select dropdowns) from the fetched
   data map (`Object.keys(issuesData)`) rather than from `model.totalRepos`,
   or they'll show entries with no underlying data when in standard mode.

## Avoid Duplication

Do not duplicate:

- Analytics formulas (health score, repo ranking, freshness, etc.)
- Fetch logic (`fetchWithCache` and the `fetchX` functions in `services/github.js`)
- Cache logic (`services/cache.js`)
- PAT detection/branching (`pat ? ... : ...`)
- Repository scoping/selection (`selectAnalysisRepos`, `getTopRepositories`)

If you find yourself re-implementing any of the above inline in a page or
component, stop and import the existing utility instead. Several bugs in
this codebase's history came from exactly this — a feature independently
re-deriving repo selection or fetch logic slightly differently than the
rest of the app, causing silent data mismatches between pages.

## Where things live

- `context/AppContext.jsx` — all shared state and data-fetching orchestration
- `services/github.js` — raw GitHub API calls, PAT-aware pagination
- `services/analytics.js` — `buildAnalyticalModel`, `getTopRepositories`, time-series builders
- `services/cache.js` — IndexedDB L2 cache wrapper
- `components/AnalysisBanner.jsx` — shared standard/complete banner + PAT gate
- `components/PATModal.jsx` — PAT entry/save/delete UI
- `components/LearnMoreModal.jsx` — explains standard vs. complete analysis limits
- `pages/*.jsx` — Overview, Repositories, Contributors, Network, Governance,
  Analytics, Settings

## Performance Constraints

Target:

- Initial load < 3 seconds
- Cached navigation < 100ms
- Network graph should remain responsive above 1,000 edges
- Zero unnecessary re-renders

Avoid:

- Nested loops over repositories where a single pass would do
- Duplicate API requests for data already in `model` or the IndexedDB cache
- Rebuilding graphs/models on every render instead of memoizing

## Testing

No automated test suite currently exists in this codebase. This section
applies once one is introduced.

When it is, every new feature should include:

- Utility/unit tests for pure functions (`services/analytics.js`,
  `services/github.js` helpers)
- Component tests where behavior is nontrivial (not just presence)

Avoid snapshot-only tests. Prefer tests that assert on actual behavior
(e.g. "given these repos and no PAT, the top 10 by score are selected")
over tests that just lock in current output.

## Before submitting a change

- Keep PRs focused — avoid unrelated refactors bundled into a feature or fix.
- If you touched fetch logic, re-check the fetch-cap table above stays
  consistent across contributors/issues/pulls.
- If you touched a page's loading/empty state, check whether a sibling
  section on the same page has an equivalent state that should match (see
  the Activity Trends / Advanced Analytics consistency pass in git history
  for the expected pattern).
- Update this file if the architecture, stable contracts, or metrics
  formulas change.
- Buttons should have explicit `type="button"` unless they're meant to
  submit a form (rare in this codebase).
- Don't hand-roll a new top-N repo cutoff — use `selectAnalysisRepos` /
  `getTopRepositories`.

## When in Doubt

Prefer consistency over cleverness.

Reuse existing hooks and components before writing new ones.

Ask before changing core architecture (see Stable Contracts above) rather
than assuming a refactor is welcome.
