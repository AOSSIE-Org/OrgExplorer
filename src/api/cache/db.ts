import { openDB } from "idb";
// Shared IndexedDB instance for caching API responses
export const dbPromise = openDB("org-explorer-db", 1, {
  upgrade(db) {
    // Create store for GitHub-related cached data if it doesn't exist
    if (!db.objectStoreNames.contains("github")) {
      db.createObjectStore("github");
    }
  },
});
