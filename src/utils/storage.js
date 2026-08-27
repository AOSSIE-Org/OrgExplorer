// src/utils/storage.js

export const STORAGE_KEYS = {
  PAT: "oe_pat",
  RATE_LIMIT: "oe_rate_limit",
  RECENT_SEARCHES: "oe_recent",
};

export const storage = {
  get: (key) => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  },
};
