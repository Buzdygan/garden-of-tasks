/**
 * Task storage service
 * 
 * This service handles storing, retrieving, and caching Asana tasks
 * in the browser's localStorage for persistence across sessions.
 */

const TASKS_STORAGE_KEY = 'garden_tasks_cached_tasks';
const LAST_SYNC_KEY = 'garden_tasks_last_sync';

export interface TaskCache {
  tasks: any[];
  timestamp: number;
}

export const taskStorage = {
  /**
   * Save tasks to localStorage
   */
  saveTasks: (tasks: any[]): void => {
    try {
      // Create a cache object with tasks and timestamp
      const cache: TaskCache = {
        tasks,
        timestamp: Date.now()
      };
      
      // Store in localStorage
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cache));
      console.log(`✅ Cached ${tasks.length} tasks to local storage`);
    } catch (e) {
      console.error('❌ Failed to cache tasks:', e);
    }
  },
  
  /**
   * Get tasks from localStorage
   */
  getTasks: (): any[] => {
    try {
      const cacheJson = localStorage.getItem(TASKS_STORAGE_KEY);
      if (!cacheJson) {
        console.log('🔍 No cached tasks found');
        return [];
      }
      
      const cache: TaskCache = JSON.parse(cacheJson);
      console.log(`🔍 Retrieved ${cache.tasks.length} cached tasks from ${new Date(cache.timestamp).toLocaleString()}`);
      return cache.tasks;
    } catch (e) {
      console.error('❌ Failed to retrieve cached tasks:', e);
      return [];
    }
  },
  
  /**
   * Check if we have cached tasks
   */
  hasCachedTasks: (): boolean => {
    try {
      return !!localStorage.getItem(TASKS_STORAGE_KEY);
    } catch (e) {
      console.error('❌ Failed to check for cached tasks:', e);
      return false;
    }
  },
  
  /**
   * Get the timestamp of the last tasks sync
   */
  getLastSyncTimestamp: (): number | null => {
    try {
      const cacheJson = localStorage.getItem(TASKS_STORAGE_KEY);
      if (!cacheJson) return null;
      
      const cache: TaskCache = JSON.parse(cacheJson);
      return cache.timestamp;
    } catch (e) {
      console.error('❌ Failed to get last sync timestamp:', e);
      return null;
    }
  },
  
  /**
   * Save the last sync date for incremental syncing
   */
  saveLastSyncDate: (date: string): void => {
    try {
      localStorage.setItem(LAST_SYNC_KEY, date);
      console.log('✅ Saved last sync date:', date);
    } catch (e) {
      console.error('❌ Failed to save last sync date:', e);
    }
  },
  
  /**
   * Get the last sync date for incremental syncing
   */
  getLastSyncDate: (): string | null => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch (e) {
      console.error('❌ Failed to get last sync date:', e);
      return null;
    }
  },
  
  /**
   * Clear cached tasks
   */
  clearTasks: (): void => {
    try {
      localStorage.removeItem(TASKS_STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      console.log('🧹 Cleared cached tasks');
    } catch (e) {
      console.error('❌ Failed to clear cached tasks:', e);
    }
  }
};

export default taskStorage; 