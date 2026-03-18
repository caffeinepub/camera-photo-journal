import {
  type QCReport,
  type QCRowData,
  deleteQCReport,
  getAllQCReports,
  saveQCReport,
} from "@/db-qc";
import { useActor } from "@/hooks/useActor";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_KEY = "qc_draft_v2";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadLocalDraft(): {
  title: string;
  date: string;
  rows: QCRowData[];
} | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocalDraft(title: string, date: string, rows: QCRowData[]): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, date, rows }));
  } catch {
    /* ignore */
  }
}

function clearLocalDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

// ─── Backend row converters ───────────────────────────────────────────────────

function rowToBackend(row: QCRowData) {
  const defectCounts = [
    row.hr1,
    row.hr2,
    row.hr3,
    row.hr4,
    row.hr5,
    row.hr6,
    row.hr7,
    row.hr8,
  ].map((v) => BigInt(Number(v) || 0));
  return {
    operationName: row.operation,
    operatorName: row.operatorName,
    defectCounts,
    defectType: row.defectType,
    numberOfDefects: BigInt(Number(row.noOfDefects) || 0),
    actionTaken: row.actionTaken,
    photo: row.photoDataUrl
      ? {
          imageData: row.photoDataUrl,
          timestamp: BigInt(row.photoTimestamp ?? Date.now()),
        }
      : undefined,
  };
}

function rowFromBackend(r: {
  operationName: string;
  operatorName: string;
  defectCounts: bigint[];
  defectType: string;
  numberOfDefects: bigint;
  actionTaken: string;
  photo?: { imageData: string; timestamp: bigint };
}): QCRowData {
  const [hr1, hr2, hr3, hr4, hr5, hr6, hr7, hr8] = r.defectCounts.map((v) =>
    Number(v) > 0 ? String(Number(v)) : "",
  );
  return {
    operation: r.operationName,
    operatorName: r.operatorName,
    hr1: hr1 ?? "",
    hr2: hr2 ?? "",
    hr3: hr3 ?? "",
    hr4: hr4 ?? "",
    hr5: hr5 ?? "",
    hr6: hr6 ?? "",
    hr7: hr7 ?? "",
    hr8: hr8 ?? "",
    defectType: r.defectType,
    noOfDefects:
      Number(r.numberOfDefects) > 0 ? String(Number(r.numberOfDefects)) : "",
    actionTaken: r.actionTaken,
    photoDataUrl: r.photo?.imageData,
    photoTimestamp: r.photo ? Number(r.photo.timestamp) : undefined,
  };
}

// ─── useReports hook ──────────────────────────────────────────────────────────

export function useReports() {
  const { actor } = useActor();
  const [reports, setReports] = useState<QCReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    try {
      const all = await getAllQCReports();
      setReports(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const saveReport = useCallback(
    async (report: QCReport): Promise<void> => {
      await saveQCReport(report);
      setReports((prev) =>
        [report, ...prev.filter((r) => r.id !== report.id)].sort(
          (a, b) => b.submittedAt - a.submittedAt,
        ),
      );
      if (actor) {
        actor
          .saveReport(
            report.title,
            BigInt(report.date),
            report.rows.map(rowToBackend),
          )
          .catch(() => {
            /* non-critical */
          });
      }
    },
    [actor],
  );

  const deleteReport = useCallback(async (id: string): Promise<void> => {
    await deleteQCReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reports, isLoading, saveReport, deleteReport, refresh: loadReports };
}

// ─── useDraft hook ────────────────────────────────────────────────────────────

export function useDraft() {
  const { actor, isFetching: actorLoading } = useActor();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    date: string;
    rows: QCRowData[];
  } | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  useEffect(() => {
    if (actorLoading) return;
    let cancelled = false;
    (async () => {
      try {
        if (actor) {
          const backendDraft = await actor.getDraftReport();
          if (
            !cancelled &&
            backendDraft &&
            backendDraft.operatorRows.length > 0
          ) {
            setDraft({
              title: backendDraft.title,
              date: new Date(Number(backendDraft.date))
                .toISOString()
                .slice(0, 10),
              rows: backendDraft.operatorRows.map(rowFromBackend),
            });
            setIsDraftLoaded(true);
            return;
          }
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        const local = loadLocalDraft();
        if (local) setDraft(local);
        setIsDraftLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actorLoading, actor]);

  const saveDraft = useCallback(
    (title: string, date: string, rows: QCRowData[]) => {
      saveLocalDraft(title, date, rows);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (actor) {
          actor
            .saveDraftReport(
              title,
              BigInt(new Date(date || Date.now()).getTime()),
              rows.map(rowToBackend),
            )
            .catch(() => {
              /* non-critical */
            });
        }
      }, 2000);
    },
    [actor],
  );

  const clearDraft = useCallback(() => {
    clearLocalDraft();
    if (actor) actor.clearDraftReport().catch(() => {});
  }, [actor]);

  return { draft, isDraftLoaded, saveDraft, clearDraft };
}
