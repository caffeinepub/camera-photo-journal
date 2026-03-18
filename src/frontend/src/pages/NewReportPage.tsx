import { QCCameraModal } from "@/components/QCCameraModal";
import { QCTable } from "@/components/QCTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDefaultRows } from "@/db-qc";
import type { QCRowData } from "@/db-qc";
import { useDraft, useReports } from "@/hooks/useReports";
import { format } from "date-fns";
import { CheckCircle, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function NewReportPage() {
  const { saveReport } = useReports();
  const { draft, isDraftLoaded, saveDraft, clearDraft } = useDraft();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<QCRowData[]>(createDefaultRows);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraRowIndex, setCameraRowIndex] = useState<number | null>(null);

  // Restore draft once loaded
  const draftAppliedRef = useRef(false);
  useEffect(() => {
    if (!isDraftLoaded || draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    if (draft) {
      setTitle(draft.title);
      setDate(draft.date || new Date().toISOString().slice(0, 10));
      setRows(draft.rows);
      toast.success("Draft restored", { duration: 2500 });
    }
  }, [isDraftLoaded, draft]);

  // Save draft on every change (debounced inside saveDraft)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isDraftLoaded) return;
    saveDraft(title, date, rows);
  }, [title, date, rows, saveDraft, isDraftLoaded]);

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
      photoTimestamp?: number;
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
                photoDataUrl: data.photoDataUrl ?? row.photoDataUrl,
                photoTimestamp: data.photoTimestamp ?? row.photoTimestamp,
              }
            : row,
        ),
      );
      setCameraRowIndex(null);
      toast.success("Photo captured");
    },
    [cameraRowIndex],
  );

  const handleSubmit = useCallback(async () => {
    const hasData = rows.some(
      (r) =>
        r.operation ||
        r.hr1 ||
        r.hr2 ||
        r.hr3 ||
        r.hr4 ||
        r.hr5 ||
        r.hr6 ||
        r.hr7 ||
        r.hr8,
    );
    if (!hasData) {
      toast.error("Please fill in at least one row before submitting.");
      return;
    }
    setIsSaving(true);
    try {
      const now = Date.now();
      const reportDate = date ? new Date(date).getTime() : now;
      await saveReport({
        id: now.toString(),
        title:
          title.trim() ||
          `QC Report — ${format(new Date(now), "MMM d, yyyy HH:mm")}`,
        date: reportDate,
        submittedAt: now,
        rows,
      });
      clearDraft();
      toast.success("Report submitted!", {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      });
      setTitle("");
      setDate(new Date().toISOString().slice(0, 10));
      setRows(createDefaultRows());
      draftAppliedRef.current = false;
    } catch {
      toast.error("Failed to save report. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [rows, title, date, saveReport, clearDraft]);

  return (
    <>
      <main
        className="min-h-screen flex flex-col"
        style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`QC Report — ${format(new Date(), "MMM d, yyyy")}`}
                className="h-8 text-sm font-semibold bg-transparent border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                data-ocid="report.title_input"
              />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-xs bg-muted border border-border rounded px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              data-ocid="report.date_input"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                saveDraft(title, date, rows);
                toast.success("Draft saved");
              }}
              data-ocid="report.save_draft_button"
            >
              <Save className="w-3 h-3 mr-1" /> Save Draft
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={handleSubmit}
              disabled={isSaving}
              data-ocid="report.submit_button"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              {isSaving ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </header>

        {/* Status legend */}
        <div className="flex gap-3 px-3 py-2 text-[10px] font-medium">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500/50" />{" "}
            Green = 0 defects
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-500/50" />{" "}
            Yellow = 1 defect
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/50" />{" "}
            Red = 2+ defects
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 px-1">
          <QCTable
            rows={rows}
            onCellChange={handleCellChange}
            onCameraClick={(i) => setCameraRowIndex(i)}
          />
        </div>

        {/* Footer */}
        <footer className="text-center text-[10px] text-muted-foreground py-4">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </footer>
      </main>

      {/* Camera modal */}
      <QCCameraModal
        open={cameraRowIndex !== null}
        rowIndex={cameraRowIndex ?? 0}
        onConfirm={handleCameraConfirm}
        onClose={() => setCameraRowIndex(null)}
      />
    </>
  );
}
