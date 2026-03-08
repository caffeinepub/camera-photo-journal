import { QCCameraModal } from "@/components/QCCameraModal";
import { QCTable } from "@/components/QCTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QCRowData } from "@/db-qc";
import { useReports } from "@/hooks/useReports";
import { format } from "date-fns";
import { CheckCircle, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ─── Default rows ─────────────────────────────────────────────────────────────

function createDefaultRows(): QCRowData[] {
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
    photoDataUrl: undefined,
  }));
}

// ─── New Report Page ──────────────────────────────────────────────────────────

export default function NewReportPage() {
  const { saveReport } = useReports();
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<QCRowData[]>(createDefaultRows);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraRowIndex, setCameraRowIndex] = useState<number | null>(null);

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof QCRowData, value: string) => {
      setRows((prev) =>
        prev.map((row, i) =>
          i === rowIndex ? { ...row, [field]: value } : row,
        ),
      );
    },
    [],
  );

  const handleCameraConfirm = useCallback(
    (data: {
      defectType: string;
      noOfDefects: string;
      actionTaken: string;
      photoDataUrl?: string;
    }) => {
      if (cameraRowIndex === null) return;
      setRows((prev) =>
        prev.map((row, i) =>
          i === cameraRowIndex
            ? {
                ...row,
                defectType: data.defectType || row.defectType,
                noOfDefects: data.noOfDefects || row.noOfDefects,
                actionTaken: data.actionTaken || row.actionTaken,
                photoDataUrl: data.photoDataUrl || row.photoDataUrl,
              }
            : row,
        ),
      );
      setCameraRowIndex(null);
      toast.success("Photo data applied to row");
    },
    [cameraRowIndex],
  );

  const handleSubmit = useCallback(async () => {
    // Check at least one row has data
    const hasData = rows.some(
      (r) =>
        r.operation ||
        r.operatorName !== `Operator ${rows.indexOf(r) + 1}` ||
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
    );

    if (!hasData) {
      toast.error("Please fill in at least one row before submitting.");
      return;
    }

    setIsSaving(true);
    try {
      const now = Date.now();
      await saveReport({
        id: now.toString(),
        title:
          title.trim() ||
          `QC Report — ${format(new Date(now), "MMM d, yyyy HH:mm")}`,
        submittedAt: now,
        rows,
      });
      toast.success("Report saved successfully!", {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      });
      // Reset form
      setTitle("");
      setRows(createDefaultRows());
    } catch {
      toast.error("Failed to save report. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [rows, title, saveReport]);

  const now = new Date();

  return (
    <>
      <main className="flex flex-col min-h-screen pb-[calc(var(--nav-height)+1rem)]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight leading-tight">
                New QC Report
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(now, "EEEE, MMM d, yyyy")} · {format(now, "HH:mm")}
              </p>
            </div>
            <Button
              data-ocid="report.submit_button"
              onClick={handleSubmit}
              disabled={isSaving}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving…" : "Submit"}
            </Button>
          </div>

          {/* Report Title Input */}
          <div className="mt-3">
            <Input
              data-ocid="report.title.input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title (e.g. Line 1 — Morning Shift)"
              className="bg-card border-input text-foreground placeholder:text-muted-foreground/50 text-sm h-9"
            />
          </div>
        </header>

        {/* Legend */}
        <div className="flex gap-3 px-4 py-2 border-b border-border/50 bg-card/30">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/50" />
            <span className="text-[10px] text-muted-foreground">0 defects</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50" />
            <span className="text-[10px] text-muted-foreground">1 defect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
            <span className="text-[10px] text-muted-foreground">
              2+ defects
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground ml-auto">
            Hold cell to edit
          </p>
        </div>

        {/* Table */}
        <div className="flex-1">
          <QCTable
            rows={rows}
            onChange={handleCellChange}
            onCameraClick={(i) => setCameraRowIndex(i)}
          />
        </div>

        {/* Footer */}
        <footer className="px-4 py-5 text-center border-t border-border/30">
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
      </main>

      {/* Camera Modal */}
      <QCCameraModal
        open={cameraRowIndex !== null}
        rowIndex={cameraRowIndex ?? 0}
        onConfirm={handleCameraConfirm}
        onClose={() => setCameraRowIndex(null)}
      />
    </>
  );
}
