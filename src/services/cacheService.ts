import { saveToIDB, getFromIDB } from "./idbService";

type RepoCacheEntry = {
  data: any[];
  savedAt: number;
};

const cacheService = {

  async saveRepos(org: string, data: any[] | RepoCacheEntry): Promise<void> {
    const entry: RepoCacheEntry = Array.isArray(data)
      ? { data, savedAt: Date.now() }
      : data;

    console.log(`Saving ${org} repos to IDB`);
    await saveToIDB(org, entry);
  },

  async getRepos(org: string): Promise<any[] | null> {
    const entry = await getFromIDB(org);

    if (!entry) {
      console.log("No cache found");
      return null;
    }

    console.log("Cache found");

    // Handle old format (raw array)
    if (Array.isArray(entry)) {
      console.log("Detected old cache format, migrating...");
      const migratedEntry: RepoCacheEntry = {
        data: entry,
        savedAt: Date.now()
      };
      // Migrate to new format in background
      cacheService.saveRepos(org, migratedEntry).catch(err => 
        console.error("Migration failed:", err)
      );
      return entry;
    }

    // Handle new format (structured object)
    if (entry && typeof entry === 'object' && 'data' in entry) {
      return entry.data;
    }

    // Unrecognized format
    console.warn(`Cache for ${org} is in an unrecognized format. Clearing it.`);
    // Optionally clear cache here if it's corrupted, but for now just return null
    return null;
  }

};

export default cacheService;