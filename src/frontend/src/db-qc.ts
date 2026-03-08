// ─── Garment QC Report — IndexedDB layer ─────────────────────────────────────

export interface QCRowData {
  operation: string;
  operatorName: string;
  hr1: string;
  hr2: string;
  hr3: string;
  hr4: string;
  hr5: string;
  hr6: string;
  hr7: string;
  hr8: string;
  defectType: string;
  noOfDefects: string;
  actionTaken: string;
  photoDataUrl?: string; // optional captured photo for the row
}

export interface QCReport {
  id: string;
  title: string;
  submittedAt: number; // Unix ms
  rows: QCRowData[];
}

const DB_NAME = "garment-qc";
const STORE_NAME = "qc_reports";
const DB_VERSION = 1;

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("submittedAt", "submittedAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return _dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveQCReport(report: QCReport): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.put(report));
}

export async function getAllQCReports(): Promise<QCReport[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("submittedAt");
  const reports = await promisifyRequest<QCReport[]>(
    index.getAll() as IDBRequest<QCReport[]>,
  );
  return reports.sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function deleteQCReport(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.delete(id));
}
