export function getRecentSearches() {
  try {
    const stored = localStorage.getItem('oe_recent')
    if (!stored) return []

    const recent = JSON.parse(stored)
    return Array.isArray(recent) && recent.every(entry => typeof entry === 'string')
      ? recent
      : []
  } catch {
    return []
  }
}
