
const DB_NAME = 'ReflectiveJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'reflections';
const QUEUE_STORE = 'syncQueue';

class OfflineDB {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

 
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('? IndexedDB opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('synced', 'synced', { unique: false });
                    console.log('?? Reflections object store created');
                }

                if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                    const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'queueId', autoIncrement: true });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                    queueStore.createIndex('type', 'type', { unique: false });
                    console.log('?? Sync queue object store created');
                }
            };
        });
    }

    /**
     * Save a reflection to IndexedDB
     */
    async saveReflection(reflection) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            reflection.synced = navigator.onLine;
            
            const request = store.put(reflection);

            request.onsuccess = () => {
                console.log('?? Reflection saved to IndexedDB:', reflection.id);
                resolve(reflection);
            };

            request.onerror = () => {
                console.error('? Failed to save reflection:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all reflections from IndexedDB
     */
    async getAllReflections() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                console.log(`?? Loaded ${request.result.length} reflections from IndexedDB`);
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error('? Failed to get reflections:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete a reflection from IndexedDB
     */
    async deleteReflection(id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('??? Reflection deleted from IndexedDB:', id);
                resolve();
            };

            request.onerror = () => {
                console.error('? Failed to delete reflection:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Mark a reflection as synced
     */
    async markAsSynced(id) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const reflection = getRequest.result;
                if (reflection) {
                    reflection.synced = true;
                    const putRequest = store.put(reflection);
                    
                    putRequest.onsuccess = () => {
                        console.log('? Marked as synced:', id);
                        resolve();
                    };
                    
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Add request to sync queue
     */
    async addToSyncQueue(type, data) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            
            const queueItem = {
                type: type, // 'POST' or 'DELETE'
                data: data,
                timestamp: new Date().toISOString()
            };
            
            const request = store.add(queueItem);

            request.onsuccess = () => {
                console.log('?? Added to sync queue:', queueItem);
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all queued sync items
     */
    async getSyncQueue() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Remove item from sync queue
     */
    async removeFromSyncQueue(queueId) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.delete(queueId);

            request.onsuccess = () => {
                console.log('? Removed from sync queue:', queueId);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Clear all reflections
     */
    async clearAll() {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('??? All reflections cleared');
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

// Create and export singleton instance
const offlineDB = new OfflineDB();
console.log('?? Offline DB initialized');
