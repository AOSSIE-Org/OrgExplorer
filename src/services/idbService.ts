// Name of the IndexedDB database
const DB_NAME = "OrgExplorerDB";

// Name of the object store (similar to a table in SQL)
const STORE_NAME = "repos";

/**
 * Opens (or creates) the IndexedDB database.
 * Returns a Promise that resolves with the database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Open database with version 1
    const request = indexedDB.open(DB_NAME, 1);

    /**
     * This event runs only when:
     * - Database is created for the first time
     * - Version number is increased
     */
    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object store if it does not already exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    // If database opens successfully, resolve the Promise
    request.onsuccess = () => resolve(request.result);

    // If an error occurs while opening, reject the Promise
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves data into IndexedDB.
 * @param key Unique identifier (e.g., organization name)
 * @param value Data to store (e.g., repos array with metadata)
 */
 export async function saveToIDB<T>(
  key: string,
  value: T
): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)

    store.put(value, key)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/**
 * Retrieves data from IndexedDB using a key.
 * @param key Unique identifier (e.g., organization name)
 * @returns Stored value or null if not found
 */
export async function getFromIDB<T>(
  key: string
): Promise<T | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(key)

    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)

    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}