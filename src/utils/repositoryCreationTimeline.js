export function buildRepositoryCreationTimeline(repos, granularity = 'yearly') {
  const monthly = granularity === 'monthly'
  const counts = new Map()

  for (const repo of repos) {
    if (typeof repo.created_at !== 'string' || !repo.created_at.trim()) continue
    const date = new Date(repo.created_at)
    if (!Number.isFinite(date.getTime())) continue

    // UTC keeps month boundaries consistent regardless of the viewer's timezone.
    const period = monthly
      ? date.getUTCFullYear() * 12 + date.getUTCMonth()
      : date.getUTCFullYear()
    counts.set(period, (counts.get(period) || 0) + 1)
  }

  if (!counts.size) return []

  const periods = [...counts.keys()].sort((a, b) => a - b)
  const timeline = []
  let cumulative = 0
  for (let period = periods[0]; period <= periods[periods.length - 1]; period++) {
    const created = counts.get(period) || 0
    cumulative += created
    const label = monthly
      ? `${Math.floor(period / 12)}-${String(period % 12 + 1).padStart(2, '0')}`
      : String(period)
    timeline.push({ period: label, created, cumulative })
  }
  return timeline
}
