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
export async function saveToIDB(key: string, value: any) {
  const db = await openDB();

  // Create a read-write transaction
  const tx = db.transaction(STORE_NAME, "readwrite");

  // Access the object store
  const store = tx.objectStore(STORE_NAME);

  // Insert or update value using the provided key
  store.put(value, key);
}

/**
 * Retrieves data from IndexedDB using a key.
 * @param key Unique identifier (e.g., organization name)
 * @returns Stored value or null if not found
 */
export async function getFromIDB(key: string): Promise<any | null> {
  const db = await openDB();

  // Create a read-only transaction
  const tx = db.transaction(STORE_NAME, "readonly");

  // Access the object store
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const req = store.get(key);

    // Resolve with stored result or null if not found
    req.onsuccess = () => resolve(req.result || null);
  });
}