

import { saveToIDB, getFromIDB } from "./idbService"

/**
 * Minimal GitHub Repo Type
 */
export interface GitHubRepo {
  id: number
  name: string
  stargazers_count: number
  forks_count: number
  language: string | null
  updated_at: string
}

/**
 * Structured cache entry format
 */
type RepoCacheEntry = {
  data: GitHubRepo[]
  savedAt: number
}

/**
 * Cache expiry time (10 minutes)
 */
const MAX_CACHE_AGE = 1000 * 60 * 10

const cacheService = {
// repos of an org are saved in cache
  async saveRepos(org: string, data: GitHubRepo[] | RepoCacheEntry): Promise<void> {
    const entry: RepoCacheEntry = Array.isArray(data)
      ? { data, savedAt: Date.now() }
      : data


    await saveToIDB(org, entry)
  },
// repos are fetched from cache if they are in cache already
  async getRepos(org: string): Promise<GitHubRepo[] | null> {
    const entry = await getFromIDB(org)

    if (!entry) {
      console.log("No cache found")
      return null
    }

    console.log("Cache found")

    //  Handle old format (raw array)
    if (Array.isArray(entry)) {

      console.log("Detected old cache format, migrating...");
      const migratedEntry: RepoCacheEntry = {
        data: entry,
        savedAt: Date.now()
      }

      cacheService.saveRepos(org, migratedEntry).catch(err =>
        console.error("Migration failed:", err)
      )

      return entry
    }

    //  Handle structured format
   if (
  typeof entry === "object" &&
  entry !== null &&
  Array.isArray((entry as any).data) &&
  typeof (entry as any).savedAt === "number"
) {
      const typedEntry = entry as RepoCacheEntry

      //  TTL CHECK
      if (Date.now() - typedEntry.savedAt > MAX_CACHE_AGE) {
        console.log("Cache expired")
        return null
      }

      return typedEntry.data
    }

    console.warn(`Cache for ${org} is in an unrecognized format.`)
    return null
  }

}

export default cacheService