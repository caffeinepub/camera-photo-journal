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
import { getRowStatusLabel } from "@/db-qc";
import { useReports } from "@/hooks/useReports";
import {
  type SheetRow,
  exportAsShareFile,
  exportAsXlsx,
} from "@/lib/xlsxExport";
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

// ─── Build sheet rows ────────────────────────────────────────────────────────────

function buildSheetRows(report: QCReport): SheetRow[] {
  const headerRow: SheetRow = {
    values: [
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
    ],
  };

  const titleRows: SheetRow[] = [
    { values: [report.title] },
    {
      values: [
        `Submitted: ${format(new Date(report.submittedAt), "MMM d, yyyy HH:mm")}`,
      ],
    },
    { values: [] },
    headerRow,
  ];

  const dataRows: SheetRow[] = report.rows.map((row: QCRowData, i: number) => {
    const status = getRowStatusLabel(row);
    const bgColor =
      status === "RED" ? "FFCCCC" : status === "YELLOW" ? "FFFACC" : "CCFFCC";
    return {
      bgColor,
      values: [
        i + 1,
        row.operation,
        row.operatorName,
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
        status,
      ],
    };
  });

  return [...titleRows, ...dataRows];
}

// ─── Report List Item ──────────────────────────────────────────────────────────

interface ReportListItemProps {
  report: QCReport;
  index: number;
  onView: (r: QCReport) => void;
  onDelete: (id: string) => void;
}

function ReportListItem({
  report,
  index,
  onView,
  onDelete,
}: ReportListItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const filename = `${report.title.replace(/[^a-z0-9]/gi, "_")}_${format(new Date(report.submittedAt), "yyyyMMdd_HHmm")}.xlsx`;

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      await exportAsXlsx(filename, "QC Report", buildSheetRows(report));
    } catch {
      toast.error("Export failed.");
    } finally {
      setIsDownloading(false);
    }
  }, [report, filename]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      toast.error("Sharing not supported on this device.");
      return;
    }
    try {
      const file = await exportAsShareFile(
        filename,
        "QC Report",
        buildSheetRows(report),
      );
      if (!file) {
        toast.error("Could not generate file for sharing.");
        return;
      }
      await navigator.share({ files: [file], title: report.title });
    } catch {
      toast.error("Share failed.");
    }
  }, [report, filename]);

  const greenCount = report.rows.filter(
    (r) => getRowStatusLabel(r) === "GREEN",
  ).length;
  const yellowCount = report.rows.filter(
    (r) => getRowStatusLabel(r) === "YELLOW",
  ).length;
  const redCount = report.rows.filter(
    (r) => getRowStatusLabel(r) === "RED",
  ).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="bg-card border border-border rounded-lg p-3"
        data-ocid={`report.item.${index + 1}`}
      >
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onView(report)}
        >
          <p className="font-semibold text-sm truncate">{report.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {format(new Date(report.submittedAt), "MMM d, yyyy · HH:mm")}
            {report.date && report.date !== report.submittedAt ? (
              <>
                {" "}
                · Report date: {format(new Date(report.date), "MMM d, yyyy")}
              </>
            ) : null}
          </p>
          <div className="flex gap-3 mt-1.5 text-[10px] font-medium">
            <span className="text-green-400">{greenCount} Green</span>
            <span className="text-yellow-400">{yellowCount} Yellow</span>
            <span className="text-red-400">{redCount} Red</span>
          </div>
        </button>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={handleDownload}
            disabled={isDownloading}
            data-ocid={`report.download_button.${index + 1}`}
          >
            {isDownloading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Download className="w-3 h-3 mr-1" />
            )}
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={handleShare}
            data-ocid={`report.share_button.${index + 1}`}
          >
            <Share2 className="w-3 h-3 mr-1" /> Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
            data-ocid={`report.delete_button.${index + 1}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent data-ocid="report.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{report.title}". This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="report.delete_cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(report.id);
                setConfirmDelete(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="report.delete_confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { reports, isLoading, deleteReport } = useReports();
  const [viewingReport, setViewingReport] = useState<QCReport | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteReport(id);
        if (viewingReport?.id === id) setViewingReport(null);
        toast.success("Report deleted.");
      } catch {
        toast.error("Failed to delete report.");
      }
    },
    [deleteReport, viewingReport],
  );

  if (viewingReport) {
    return (
      <main
        className="min-h-screen flex flex-col"
        style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}
      >
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewingReport(null)}
              data-ocid="report_view.back_button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {viewingReport.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(
                  new Date(viewingReport.submittedAt),
                  "MMM d, yyyy HH:mm",
                )}
              </p>
            </div>
          </div>
        </header>
        <div className="flex-1 px-1 pt-2">
          <QCTable rows={viewingReport.rows} readOnly />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}
    >
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="font-bold text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Report History
        </h1>
      </header>

      <div className="flex-1 px-3 py-3 space-y-2">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16"
            data-ocid="reports.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 text-center"
            data-ocid="reports.empty_state"
          >
            <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No reports yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Submit a report from the New Report tab.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {reports.map((report, i) => (
              <ReportListItem
                key={report.id}
                report={report}
                index={i}
                onView={setViewingReport}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
