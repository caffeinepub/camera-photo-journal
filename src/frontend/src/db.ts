// ─── Photo Journal — IndexedDB layer ─────────────────────────────────────────
//
// Plain IndexedDB wrapper (no external dependency needed — idb is not
// installed, so we use the native API directly).

export interface Photo {
  id: string; // Date.now().toString() or uuid
  name: string; // user-provided label, may be empty string
  blob: Blob; // JPEG image data
  dateTaken: number; // Unix timestamp (ms)
  dateGroup: string; // e.g. "March 6, 2026"
}

const DB_NAME = "photo-journal";
const STORE_NAME = "photos";
const DB_VERSION = 1;

// ─── Open / initialise ───────────────────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("dateTaken", "dateTaken", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return _dbPromise;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function savePhoto(photo: Photo): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.put(photo));
}

export async function getAllPhotos(): Promise<Photo[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("dateTaken");
  const photos = await promisifyRequest<Photo[]>(
    index.getAll() as IDBRequest<Photo[]>,
  );
  // Sort newest first
  return photos.sort((a, b) => b.dateTaken - a.dateTaken);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return promisifyRequest<Photo | undefined>(
    store.get(id) as IDBRequest<Photo | undefined>,
  );
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.delete(id));
}
