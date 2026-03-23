import { getOrganizationFromGitHub, type OrgResult } from "../api/github";

const DB_NAME = "org-explorer-cache";
const STORE_NAME = "organizations";
const DB_VERSION = 1;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const META_PREFIX = "org-explorer:meta:";

interface CachedOrgRecord {
  login: string;
  data: OrgResult["org"];
  cachedAt: number;
  expiresAt: number;
}

interface CachedMeta {
  cachedAt: number;
  expiresAt: number;
}

function metaKey(login: string): string {
  return `${META_PREFIX}${login.toLowerCase()}`;
}

function getMeta(login: string): CachedMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(login));
    if (!raw) return null;
    return JSON.parse(raw) as CachedMeta;
  } catch {
    return null;
  }
}

function setMeta(login: string, meta: CachedMeta): void {
  localStorage.setItem(metaKey(login), JSON.stringify(meta));
}

function clearMeta(login: string): void {
  localStorage.removeItem(metaKey(login));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "login" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function readCached(login: string): Promise<CachedOrgRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(login.toLowerCase());
    request.onsuccess = () => {
      resolve((request.result as CachedOrgRecord | undefined) ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read cached organization"));
  });
}

async function writeCached(record: CachedOrgRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to write cached organization"));
    tx.objectStore(STORE_NAME).put(record);
  });
}

async function removeCached(login: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to clear cached organization"));
    tx.objectStore(STORE_NAME).delete(login.toLowerCase());
  });
}

export async function getOrganization(
  rawLogin: string,
  options?: { forceRefresh?: boolean; ttlMs?: number },
): Promise<OrgResult> {
  const login = rawLogin.trim().toLowerCase();
  if (!login) throw new Error("Please enter an organization login.");

  const forceRefresh = options?.forceRefresh ?? false;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!forceRefresh) {
    const meta = getMeta(login);
    if (meta && Date.now() <= meta.expiresAt) {
      const cached = await readCached(login);
      if (cached) {
        return {
          org: cached.data,
          source: "cache",
          cachedAt: cached.cachedAt,
        };
      }
    }
  }

  const org = await getOrganizationFromGitHub(login);
  const cachedAt = Date.now();
  const expiresAt = cachedAt + ttlMs;
  const record: CachedOrgRecord = {
    login,
    data: org,
    cachedAt,
    expiresAt,
  };
  await writeCached(record);
  setMeta(login, { cachedAt, expiresAt });

  return { org, source: "network", cachedAt };
}

export async function refreshOrganization(login: string): Promise<OrgResult> {
  return getOrganization(login, { forceRefresh: true });
}

export async function clearOrganizationCache(login: string): Promise<void> {
  const cleaned = login.trim().toLowerCase();
  if (!cleaned) return;
  clearMeta(cleaned);
  await removeCached(cleaned);
}
