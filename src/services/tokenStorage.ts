/**
 * Token storage service
 * 
 * This service handles storing, retrieving, and clearing Asana tokens
 * in the browser's localStorage for persistence across sessions.
 */

const TOKEN_STORAGE_KEY = 'garden_tasks_asana_token';

export const tokenStorage = {
  /**
   * Save token to localStorage
   */
  saveToken: (token: string): void => {
    try {
      // First clear any existing token
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      
      // Then set the new token
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      console.log('✅ Token saved to local storage:', token);
    } catch (e) {
      console.error('❌ Failed to save token:', e);
    }
  },
  
  /**
   * Get token from localStorage
   */
  getToken: (): string | null => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('🔍 Get token from storage:', token ? `"${token}"` : 'null');
      return token;
    } catch (e) {
      console.error('❌ Failed to get token:', e);
      return null;
    }
  },
  
  /**
   * Clear token from localStorage
   */
  clearToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      console.log('🧹 Token removed from local storage');
      
      // Verify it was actually removed
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        console.warn('⚠️ Token still exists after removal attempt:', token);
      } else {
        console.log('✅ Confirmed token was removed');
      }
    } catch (e) {
      console.error('❌ Failed to clear token:', e);
    }
  },
  
  /**
   * Check if a token exists in localStorage
   */
  hasToken: (): boolean => {
    try {
      const hasToken = !!localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('🔍 Token exists in storage:', hasToken);
      return hasToken;
    } catch (e) {
      console.error('❌ Failed to check token existence:', e);
      return false;
    }
  },
  
  /**
   * Debug function to help troubleshoot token issues
   */
  debugStorage: (): void => {
    console.group('🔍 Token Storage Debug Info');
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        console.error('❌ localStorage is not available in this browser');
        return;
      }
      
      // Check for our token
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('Token value:', token ? `"${token}"` : 'null');
      console.log('Token exists:', !!token);
      
      // List all items in localStorage for debugging
      console.log('All localStorage items:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          console.log(`- ${key}: ${value}`);
        }
      }
    } catch (e) {
      console.error('❌ Error during debug:', e);
    }
    console.groupEnd();
  }
};

// Run debug on import to help troubleshoot
tokenStorage.debugStorage();

export default tokenStorage; 