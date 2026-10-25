/**
 * Open issue vs open pull request counting.
 *
 * GitHub's `open_issues_count` on a repository is NOT an issue count. It is the
 * sum of open issues and open pull requests, because on GitHub a pull request
 * is also an issue. OrgExplorer used to present that number under the label
 * "Open Issues", which overstated the backlog of every repository that had
 * open pull requests (#375).
 *
 * The split is not free. REST list endpoints only expose the combined number,
 * and the search API that could separate them lives in a 10 requests/minute
 * bucket — unusable for a portfolio of repositories. It IS already paid for
 * on every repository the governance audit has visited, because
 * `/repos/{owner}/{repo}/issues` returns issues and pull requests together
 * and the `pull_request` key tells them apart.
 *
 * This module is the single place that models that quirk, so pages and the
 * CSV export can never drift apart again.
 */

/** Label for GitHub's combined open count, used wherever it is shown. */
export const OPEN_BACKLOG_LABEL = 'Open Issues & PRs'

/** GitHub marks a pull request with a `pull_request` key on the issue object. */
export function isPullRequestItem(item) {
  return Boolean(item?.pull_request)
}

/**
 * Split a GitHub `/issues` payload into plain issues and pull requests.
 *
 * `/repos/{owner}/{repo}/issues` returns both kinds of item, so every caller
 * that means "issue" has to filter pull requests out explicitly.
 */
export function splitIssueItems(items) {
  if (!Array.isArray(items)) return { issues: [], pulls: [] }

  const issues = []
  const pulls = []

  for (const item of items) {
    if (isPullRequestItem(item)) pulls.push(item)
    else issues.push(item)
  }

  return { issues, pulls }
}

/**
 * Open counts for one repository.
 *
 * `combined` is GitHub's own `open_issues_count` (open issues + open pull
 * requests) and is always available. `openIssues` and `openPulls` are the
 * exact split; they stay `null` until the repository has been audited, so
 * callers never present a guess as a fact.
 *
 * `exact` is self-validating: the split only counts as exact when it adds up
 * to the combined number GitHub reported. A truncated audit payload yields a
 * lower bound instead — the endpoint sorts by `created` descending, so a
 * long-open issue can fall past the last fetched page.
 */
export function computeOpenCounts(repo, auditItems) {
  const combined = Number(repo?.open_issues_count) || 0

  if (!Array.isArray(auditItems)) {
    return { combined, openIssues: null, openPulls: null, exact: false }
  }

  const { issues, pulls } = splitIssueItems(auditItems)

  const openIssues = issues.filter(item => item.state === 'open').length
  const openPulls = pulls.filter(item => item.state === 'open').length

  return {
    combined,
    openIssues,
    openPulls,
    exact: openIssues + openPulls === combined,
  }
}

/**
 * Human-readable explanation of what `computeOpenCounts` was able to
 * determine, for a tooltip.
 */
export function describeOpenCounts(counts) {
  if (!counts) return ''

  const { combined, openIssues, openPulls, exact } = counts

  if (openIssues === null || openPulls === null) {
    return `GitHub reports ${combined} open issues and open pull requests combined. Run the governance audit to split them.`
  }

  if (!exact) {
    return `Audit data is partial: ${openIssues} open issues and ${openPulls} open pull requests so far (GitHub reports ${combined} combined).`
  }

  return `${openIssues} open issues · ${openPulls} open pull requests (GitHub reports ${combined} combined).`
}
