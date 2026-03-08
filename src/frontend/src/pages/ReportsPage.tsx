import { QCTable } from "@/components/QCTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { QCReport, QCRowData } from "@/db-qc";
import { useReports } from "@/hooks/useReports";
import { format } from "date-fns";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Loader2,
  Share2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Excel Export Helper ──────────────────────────────────────────────────────

function getRowStatus(row: QCRowData): string {
  const total = [
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
  if (total >= 2) return "RED";
  if (total === 1) return "YELLOW";
  return "GREEN";
}

function exportToExcel(report: QCReport): Blob {
  const headers = [
    "#",
    "Operation",
    "Operator Name",
    "1st Hour",
    "2nd Hour",
    "3rd Hour",
    "4th Hour",
    "5th Hour",
    "6th Hour",
    "7th Hour",
    "8th Hour",
    "Defect Type",
    "No. of Defects",
    "Action Taken",
    "Status",
  ];

  const dataRows = report.rows.map((row, i) => [
    i + 1,
    row.operation,
    row.operatorName || `Operator ${i + 1}`,
    Number(row.hr1) || 0,
    Number(row.hr2) || 0,
    Number(row.hr3) || 0,
    Number(row.hr4) || 0,
    Number(row.hr5) || 0,
    Number(row.hr6) || 0,
    Number(row.hr7) || 0,
    Number(row.hr8) || 0,
    row.defectType,
    Number(row.noOfDefects) || 0,
    row.actionTaken,
    getRowStatus(row),
  ]);

  // Title row + blank + headers + data
  const sheetData = [
    [report.title],
    [`Submitted: ${format(new Date(report.submittedAt), "MMM d, yyyy HH:mm")}`],
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws["!cols"] = [
    { wch: 4 },
    { wch: 14 },
    { wch: 16 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "QC Report");

  const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([xlsxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ─── Count filled rows ────────────────────────────────────────────────────────

function countFilledRows(rows: QCRowData[]): number {
  return rows.filter(
    (r, i) =>
      r.operation ||
      r.operatorName !== `Operator ${i + 1}` ||
      r.hr1 ||
      r.hr2 ||
      r.hr3 ||
      r.hr4 ||
      r.hr5 ||
      r.hr6 ||
      r.hr7 ||
      r.hr8 ||
      r.defectType ||
      r.noOfDefects ||
      r.actionTaken,
  ).length;
}

// ─── Report Viewer ─────────────────────────────────────────────────────────────

interface ReportViewerProps {
  report: QCReport;
  onBack: () => void;
  onDelete: (id: string) => void;
}

function ReportViewer({ report, onBack, onDelete }: ReportViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const blob = exportToExcel(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `${report.title.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(report.submittedAt), "yyyyMMdd_HHmm")}.xlsx`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel file downloaded!");
    } catch {
      toast.error("Failed to export Excel file.");
    } finally {
      setIsDownloading(false);
    }
  }, [report]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      toast.error("Web Share not supported on this browser.");
      return;
    }
    setIsSharing(true);
    try {
      const blob = exportToExcel(report);
      const filename = `${report.title.replace(/[^a-z0-9]/gi, "_")}.xlsx`;
      const file = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await navigator.share({
        title: report.title,
        text: `QC Report — ${format(new Date(report.submittedAt), "MMM d, yyyy HH:mm")}`,
        files: [file],
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Failed to share report.");
      }
    } finally {
      setIsSharing(false);
    }
  }, [report]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      onDelete(report.id);
      toast.success("Report deleted.");
    } catch {
      toast.error("Failed to delete report.");
      setIsDeleting(false);
    }
  }, [report.id, onDelete]);

  const greenCount = report.rows.filter(
    (r) => getRowStatus(r) === "GREEN",
  ).length;
  const yellowCount = report.rows.filter(
    (r) => getRowStatus(r) === "YELLOW",
  ).length;
  const redCount = report.rows.filter((r) => getRowStatus(r) === "RED").length;

  return (
    <motion.div
      key="viewer"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-30 bg-background flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="report_viewer.close_button"
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-card hover:bg-accent text-foreground transition-colors shrink-0"
            aria-label="Back to reports"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base font-bold text-foreground truncate">
              {report.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(report.submittedAt), "MMM d, yyyy · HH:mm")}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs font-semibold text-green-400">
              {greenCount}
            </span>
            <span className="text-[10px] text-green-400/70 truncate">
              Clean
            </span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
            <span className="text-xs font-semibold text-yellow-400">
              {yellowCount}
            </span>
            <span className="text-[10px] text-yellow-400/70 truncate">
              1 Defect
            </span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-xs font-semibold text-red-400">
              {redCount}
            </span>
            <span className="text-[10px] text-red-400/70 truncate">
              2+ Defects
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            data-ocid="report_viewer.download_button"
            onClick={handleDownload}
            disabled={isDownloading}
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 border-border text-foreground hover:bg-accent"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Excel
          </Button>
          <Button
            data-ocid="report_viewer.share_button"
            onClick={handleShare}
            disabled={isSharing}
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 border-border text-foreground hover:bg-accent"
          >
            {isSharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            Share
          </Button>
          <Button
            data-ocid="report_viewer.delete_button"
            onClick={() => setShowDeleteDialog(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <QCTable rows={report.rows} readOnly />
      </div>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              Delete Report?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete "{report.title}". This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="delete_confirm.cancel_button"
              className="border-border text-foreground hover:bg-accent"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="delete_confirm.confirm_button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ─── Reports List Page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { reports, isLoading, deleteReport } = useReports();
  const [viewingReport, setViewingReport] = useState<QCReport | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteReport(id);
      setViewingReport(null);
    },
    [deleteReport],
  );

  return (
    <>
      <main className="flex flex-col min-h-screen pb-[calc(var(--nav-height)+1rem)]">
        {/* Header */}
        <header className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-background/95 backdrop-blur-sm border-b border-border">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : reports.length === 0
                ? "No reports saved yet"
                : `${reports.length} report${reports.length !== 1 ? "s" : ""}`}
          </p>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div
            data-ocid="reports.empty_state"
            className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center border border-border">
              <ClipboardList className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground mb-1">
                No reports yet
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Submit a QC report from the New Report tab to see it here.
              </p>
            </div>
          </div>
        ) : (
          <div data-ocid="reports.list" className="flex flex-col gap-3 p-4">
            {reports.map((report, i) => {
              const filledRows = countFilledRows(report.rows);
              const green = report.rows.filter(
                (r) => getRowStatus(r) === "GREEN",
              ).length;
              const yellow = report.rows.filter(
                (r) => getRowStatus(r) === "YELLOW",
              ).length;
              const red = report.rows.filter(
                (r) => getRowStatus(r) === "RED",
              ).length;
              const markerIndex = i + 1;

              return (
                <button
                  key={report.id}
                  type="button"
                  data-ocid={`reports.item.${markerIndex}`}
                  onClick={() => setViewingReport(report)}
                  className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-accent/30 active:scale-[0.99] transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(
                          new Date(report.submittedAt),
                          "MMM d, yyyy · HH:mm",
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                      {filledRows} row{filledRows !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Status bar */}
                  <div className="flex gap-1.5 mt-3">
                    {green > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] text-green-400 font-medium">
                          {green}
                        </span>
                      </div>
                    )}
                    {yellow > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        <span className="text-[10px] text-yellow-400 font-medium">
                          {yellow}
                        </span>
                      </div>
                    )}
                    {red > 0 && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[10px] text-red-400 font-medium">
                          {red}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Footer */}
            <footer className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()}.{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Built with ♥ using caffeine.ai
                </a>
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* Report Viewer */}
      <AnimatePresence>
        {viewingReport && (
          <ReportViewer
            key={viewingReport.id}
            report={viewingReport}
            onBack={() => setViewingReport(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
