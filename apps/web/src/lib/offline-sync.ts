/**
 * Offline Sync Utilities for T1D India PWA
 * Handles IndexedDB storage, background sync registration, and conflict resolution
 */

// Types
interface PendingMutation {
  id?: number;
  type: 'meal' | 'insulin' | 'cgm';
  data: any;
  timestamp: number;
  retries: number;
  clientId: string;
}

interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  isSyncing: boolean;
}

// IndexedDB setup
const DB_NAME = 't1d-offline';
const DB_VERSION = 1;
const STORES = {
  MEALS: 'pendingMeals',
  INSULIN: 'pendingInsulin',
  CGM: 'pendingCGM',
  SETTINGS: 'settings',
  CACHE: 'apiCache',
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('t1d-offline', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('pendingMeals')) {
          const mealStore = db.createObjectStore('pendingMeals', { keyPath: 'id', autoIncrement: true });
          mealStore.createIndex('timestamp', 'timestamp');
          mealStore.createIndex('clientId', 'clientId');
        }

        if (!db.objectStoreNames.contains('pendingInsulin')) {
          const insulinStore = db.createObjectStore('pendingInsulin', { keyPath: 'id', autoIncrement: true });
          insulinStore.createIndex('timestamp', 'timestamp');
          insulinStore.createIndex('clientId', 'clientId');
        }

        if (!db.objectStoreNames.contains('pendingCGM')) {
          const cgmStore = db.createObjectStore('pendingCGM', { keyPath: 'id', autoIncrement: true });
          cgmStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }

        if (!db.objectStoreNames.contains('apiCache')) {
          const cacheStore = db.createObjectStore('apiCache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// Online/offline detection
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let onlineListeners: ((online: boolean) => void)[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    onlineListeners.forEach(cb => cb(true));
    triggerSync();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    onlineListeners.forEach(cb => cb(false));
  });
}

export function onOnlineChange(callback: (online: boolean) => void) {
  onlineListeners.push(callback);
  return () => {
    onlineListeners = onlineListeners.filter(cb => cb !== callback);
  };
}

export function getOnlineStatus(): boolean {
  return isOnline;
}

// Queue mutations for offline sync
export async function queueMutation(type: 'meal' | 'insulin' | 'cgm', data: any): Promise<number> {
  const db = await getDB();
  const clientId = getClientId();

  const mutation = {
    type,
    data,
    timestamp: Date.now(),
    retries: 0,
    clientId,
  };

  const storeName = type === 'meal' ? 'pendingMeals' :
                    type === 'insulin' ? 'pendingInsulin' : 'pendingCGM';

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([type === 'meal' ? 'pendingMeals' :
                                        type === 'insulin' ? 'pendingInsulin' : 'pendingCGM'], 'readwrite');
    const store = transaction.objectStore(type === 'meal' ? 'pendingMeals' :
                                          type === 'insulin' ? 'pendingInsulin' : 'pendingCGM');
    const request = store.add({ ...mutation, type: undefined });

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

// Get pending mutations count
export async function getPendingCount(): Promise<number> {
  const db = await getDB();

  const counts = await Promise.all([
    getStoreCount('pendingMeals'),
    getStoreCount('pendingInsulin'),
    getStoreCount('pendingCGM'),
  ]);

  return counts.reduce((sum, count) => sum + count, 0);
}

function getStoreCount(storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getDB().then(db => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

// Get last sync time
export async function getLastSynced(): Promise<Date | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('lastSynced');

    request.onsuccess = () => {
      const value = request.result;
      resolve(value ? new Date(value) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Update last sync time
async function updateLastSynced(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(Date.now(), 'lastSynced');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Trigger background sync
export async function triggerSync(): Promise<void> {
  if (!isOnline) return;

  try {
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-all');
    }
  } catch (error) {
    console.warn('Background sync registration failed:', error);
    // Fallback: manual sync
    await manualSync();
  }
}

// Manual sync fallback
async function manualSync(): Promise<void> {
  const db = await getDB();

  // Sync meals
  const meals = await getAllFromStore('pendingMeals');
  for (const meal of meals) {
    try {
      const response = await fetch('/api/v1/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meal.data),
      });

      if (response.ok) {
        await deleteFromStore('pendingMeals', meal.id);
      }
    } catch (error) {
      console.error('Failed to sync meal:', error);
    }
  }

  // Sync insulin
  const insulin = await getAllFromStore('pendingInsulin');
  for (const log of insulin) {
    try {
      const response = await fetch('/api/v1/insulin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log.data),
      });

      if (response.ok) {
        await deleteFromStore('pendingInsulin', log.id);
      }
    } catch (error) {
      console.error('Failed to sync insulin:', error);
    }
  }

  // Sync CGM
  const cgm = await getAllFromStore('pendingCGM');
  if (cgm.length > 0) {
    try {
      const response = await fetch('/api/v1/cgm/readings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings: cgm.map(r => r.data) }),
      });

      if (response.ok) {
        await clearStore('pendingCGM');
      }
    } catch (error) {
      console.error('Failed to sync CGM:', error);
    }
  }

  // Update last sync time
  await updateLastSyncTime();
}

// Get sync status
export async function getSyncStatus(): Promise<SyncStatus> {
  const [pendingCount, lastSynced] = await Promise.all([
    getPendingCount(),
    getLastSynced(),
  ]);

  return {
    isOnline,
    pendingCount,
    lastSynced,
    isSyncing: false, // Would need additional state tracking
  };
}

// Cache API responses
export async function cacheApiResponse(key: string, data: any): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const request = store.put({
      key,
      data,
      timestamp: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get cached API response
export async function getCachedApiResponse(key: string, maxAge = 5 * 60 * 1000): Promise<any | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['apiCache'], 'readonly');
    const store = transaction.objectStore('apiCache');
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      // Check if cache is stale
      if (Date.now() - result.timestamp > maxAge) {
        resolve(null);
        return;
      }

      resolve(result.data);
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear old cache entries
export async function clearOldCache(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['apiCache'], 'readwrite');
    const store = transaction.objectStore('apiCache');
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(Date.now() - maxAge);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Helper functions
function getAllFromStore(storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    getDB().then(db => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteFromStore(storeName: string, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    getDB().then(db => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function clearStore(storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getDB().then(db => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

async function updateSyncTime(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(Date.now(), 'lastSynced');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getClientId(): string {
  let clientId = localStorage.getItem('t1d-client-id');
  if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('t1d-client-id', clientId);
  }
  return clientId;
}

// Conflict resolution for sync
export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  serverData: any;
  clientData: any;
  mergedData?: any;
}

export async function resolveConflict(
  type: 'meal' | 'insulin' | 'cgm',
  serverData: any,
  clientData: any
): Promise<ConflictResolution> {
  // For meals: merge items, keep latest timestamp
  // For insulin: server wins (safety critical)
  // For CGM: server wins (device is source of truth)

  if (type === 'meal') {
    // Merge meal items, prefer client for new items, server for updates
    const merged = { ...serverData };
    if (clientData.items) {
      merged.items = mergeMealItems(serverData.items || [], clientData.items);
    }
    return { strategy: 'merge', serverData, clientData, mergedData: merged };
  }

  // Safety-critical: server wins
  return { strategy: 'server-wins', serverData, clientData };
}

function mergeMealItems(serverItems: any[], clientItems: any[]): any[] {
  const merged = [...serverItems];

  for (const clientItem of clientItems) {
    const existingIndex = merged.findIndex(s => s.foodId === clientItem.foodId);
    if (existingIndex >= 0) {
      // Update existing with client data (more recent)
      merged[existingIndex] = { ...merged[existingIndex], ...clientItem };
    } else {
      // Add new item from client
      merged.push(clientItem);
    }
  }

  return merged;
}

// Register periodic sync (if supported)
export async function registerPeriodicSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).periodicSync.register('sync-data', {
        minInterval: 15 * 60 * 1000, // 15 minutes
      });
    } catch (error) {
      console.warn('Periodic sync registration failed:', error);
    }
  }
}

// Initialize offline sync
export async function initializeOfflineSync(): Promise<void> {
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[OfflineSync] Service worker registered');
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }

  // Register background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-all');
      console.log('[OfflineSync] Background sync registered');
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }

  // Register periodic sync
  await registerPeriodicSync();

  // Initial sync if online
  if (isOnline) {
    await triggerSync();
  }

  console.log('[OfflineSync] Initialized');
}

// Export for use in components
export const offlineSync = {
  queueMutation,
  getPendingCount,
  getSyncStatus,
  triggerSync,
  cacheApiResponse,
  getCachedApiResponse,
  clearOldCache,
  initializeOfflineSync,
  onOnlineChange,
  getOnlineStatus,
};