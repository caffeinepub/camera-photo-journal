// ─── Garment QC Report — types & IndexedDB layer ─────────────────────────────

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
  photoDataUrl?: string; // base64 data URL
  photoTimestamp?: number; // unix ms
}

export interface QCReport {
  id: string;
  title: string;
  date: number; // unix ms — the report date
  submittedAt: number; // unix ms
  rows: QCRowData[];
}

const DB_NAME = "garment-qc-v2";
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

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveQCReport(report: QCReport): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await idbReq(tx.objectStore(STORE_NAME).put(report));
}

export async function getAllQCReports(): Promise<QCReport[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const all: QCReport[] = await idbReq(tx.objectStore(STORE_NAME).getAll());
  return all.sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function getQCReportById(id: string): Promise<QCReport | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  return (await idbReq(tx.objectStore(STORE_NAME).get(id))) ?? null;
}

export async function deleteQCReport(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await idbReq(tx.objectStore(STORE_NAME).delete(id));
}

// ─── Row helpers ─────────────────────────────────────────────────────────────

export function getRowDefectTotal(row: QCRowData): number {
  return [
    row.hr1,
    row.hr2,
    row.hr3,
    row.hr4,
    row.hr5,
    row.hr6,
    row.hr7,
    row.hr8,
  ]
    .map((v) => Number(v) || 0)
    .reduce((a, b) => a + b, 0);
}

export function getRowColorClass(row: QCRowData): string {
  const total = getRowDefectTotal(row);
  if (total >= 2) return "row-red";
  if (total === 1) return "row-yellow";
  return "row-green";
}

export function getRowStatusLabel(row: QCRowData): string {
  const total = getRowDefectTotal(row);
  if (total >= 2) return "RED";
  if (total === 1) return "YELLOW";
  return "GREEN";
}

export function createDefaultRows(): QCRowData[] {
  return Array.from({ length: 30 }, (_, i) => ({
    operation: "",
    operatorName: `Operator ${i + 1}`,
    hr1: "",
    hr2: "",
    hr3: "",
    hr4: "",
    hr5: "",
    hr6: "",
    hr7: "",
    hr8: "",
    defectType: "",
    noOfDefects: "",
    actionTaken: "",
  }));
}
