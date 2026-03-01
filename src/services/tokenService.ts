/**
 * Service for managing the GitHub Personal Access Token (PAT).
 * Currently stores the token in memory for security and as a temporary measure.
 * 
 * TODO: Mentors are discussing future persistence options (IndexedDB, encrypted storage).
 */

let _token: string | null = null;

const tokenService = {
  /**
   * Sets the GitHub PAT in memory.
   * @param token 
   */
  setToken(token: string): void {
    _token = token;
  },

  /**
   * Gets the GitHub PAT from memory.
   * @returns 
   */
  getToken(): string | null {
    return _token;
  },

  /**
   * Removes the GitHub PAT from memory.
   */
  removeToken(): void {
    _token = null;
  }
};

export default tokenService;
