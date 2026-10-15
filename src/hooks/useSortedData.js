import { useState, useMemo } from 'react'

export function useSortedData(data = [], defaultKey = 'healthScore', defaultDir = 'desc') {
  const [cfg, setCfg] = useState({ key: defaultKey, dir: defaultDir })

  const onSort = key =>
    setCfg(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }))

  const sorted = useMemo(() => {
    if (!data.length) return []
    return [...data].sort((a, b) => {
      let va = a[cfg.key] ?? '', vb = b[cfg.key] ?? ''
      // Handle arrays (e.g. repos, orgs)
      if (Array.isArray(va)) va = va.length
      if (Array.isArray(vb)) vb = vb.length
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : Number(va) - Number(vb)
      return cfg.dir === 'asc' ? cmp : -cmp
    })
  }, [data, cfg.key, cfg.dir])

  return { sorted, sortConfig: cfg, onSort }
}


export function useAdvancedMetrics(pulls = []) {
  return useMemo(() => {
    if (!pulls || !pulls.length) {
      return {
        avgMergeDays: 0,
        acceptanceRate: 0,
        merged: 0,
        rejected: 0
      }
    }

    const validPulls = pulls.filter(Boolean)
    const mergedPRs = validPulls.filter(pr => pr.merged_at)
    const rejectedPRs = validPulls.filter(
      pr => pr.state === 'closed' && !pr.merged_at
    )

    const totalMergeTime = mergedPRs.reduce((sum, pr) => {
      const duration = new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()
      return Number.isFinite(duration) && duration >= 0 ? sum + duration : sum
    }, 0)

    const avgMergeDays =
      mergedPRs.length === 0
        ? 0
        : (totalMergeTime / mergedPRs.length / (1000 * 60 * 60)) || 0

    const acceptanceRate =
      mergedPRs.length + rejectedPRs.length === 0
        ? 0
        : (mergedPRs.length /
            (mergedPRs.length + rejectedPRs.length)) *
          100

    return {
      avgMergeDays,
      acceptanceRate,
      merged: mergedPRs.length,
      rejected: rejectedPRs.length
    }
  }, [pulls])
}
