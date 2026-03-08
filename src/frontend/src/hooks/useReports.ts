import {
  type QCReport,
  deleteQCReport,
  getAllQCReports,
  saveQCReport,
} from "@/db-qc";
import { useCallback, useEffect, useState } from "react";

export function useReports() {
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

  const saveReport = useCallback(async (report: QCReport): Promise<void> => {
    await saveQCReport(report);
    setReports((prev) => {
      const updated = [report, ...prev.filter((r) => r.id !== report.id)];
      return updated.sort((a, b) => b.submittedAt - a.submittedAt);
    });
  }, []);

  const deleteReport = useCallback(async (id: string): Promise<void> => {
    await deleteQCReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadReports();
  }, [loadReports]);

  return { reports, isLoading, saveReport, deleteReport, refresh };
}
