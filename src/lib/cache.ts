import { openDB, type IDBPDatabase } from 'idb';
import type { CacheEntry } from '../types';

const DB_NAME = 'github-org-explorer';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

// TTL constants (in milliseconds)
export const TTL_ORG = 12 * 60 * 60 * 1000;           // 12 hours
export const TTL_REPOS = 6 * 60 * 60 * 1000;          //  6 hours
export const TTL_CONTRIBUTORS = 6 * 60 * 60 * 1000;   //  6 hours
export const TTL_ACTIVITY = 3 * 60 * 60 * 1000;       //  3 hours

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired – clean up
      await db.delete(STORE_NAME, key);
      return null;
    }
    return entry.data;
  } catch (err) {
    console.warn('[Cache] Read error:', err);
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const db = await getDB();
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    await db.put(STORE_NAME, entry, key);
  } catch (err) {
    console.warn('[Cache] Write error:', err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
  } catch (err) {
    console.warn('[Cache] Delete error:', err);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.warn('[Cache] Clear error:', err);
  }
}

export async function getCacheKeys(): Promise<IDBValidKey[]> {
  try {
    const db = await getDB();
    return await db.getAllKeys(STORE_NAME);
  } catch {
    return [];
  }
}

export async function getCacheStats(): Promise<{ count: number; keys: string[] }> {
  const keys = await getCacheKeys();
  return {
    count: keys.length,
    keys: keys.map((k) => String(k)),
  };
}

export async function getCacheTimestamp(key: string): Promise<number | null> {
  try {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, key) as CacheEntry<unknown> | undefined;
    return entry ? entry.timestamp : null;
  } catch {
    return null;
  }
}

// Convenience key builders
export const cacheKey = {
  org: (orgName: string) => `org:${orgName.toLowerCase()}`,
  repos: (orgName: string) => `repos:${orgName.toLowerCase()}`,
  languages: (orgName: string) => `languages:${orgName.toLowerCase()}`,
  contributors: (orgName: string) => `contributors:${orgName.toLowerCase()}`,
  activity: (orgName: string) => `activity:${orgName.toLowerCase()}`,
  repoDetail: (org: string, repo: string) => `repo-detail:${org.toLowerCase()}/${repo.toLowerCase()}`,
};

export const TTL_REPO_DETAIL = 2 * 60 * 60 * 1000; // 2 hours
