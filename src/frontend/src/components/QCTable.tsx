import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QCRowData } from "@/db-qc";
import { Camera } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ─── Row color coding ──────────────────────────────────────────────────────────

function getRowColor(row: QCRowData): string {
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
  if (total >= 2) return "row-red";
  if (total === 1) return "row-yellow";
  return "row-green";
}

// ─── Long-press hook ───────────────────────────────────────────────────────────

function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFiredRef = useRef(false);

  const start = useCallback(() => {
    hasFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      hasFiredRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
  };
}

// ─── Edit Cell Dialog ──────────────────────────────────────────────────────────

interface EditCellDialogProps {
  open: boolean;
  fieldName: string;
  value: string;
  isNumeric: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

function EditCellDialog({
  open,
  fieldName,
  value,
  isNumeric,
  onSave,
  onClose,
}: EditCellDialogProps) {
  const [draft, setDraft] = useState(value);

  // Sync draft when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setDraft(value);
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Edit: {fieldName}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-sm text-muted-foreground mb-1.5 block">
            {fieldName}
          </Label>
          <Input
            data-ocid="edit_cell.input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type={isNumeric ? "number" : "text"}
            min={isNumeric ? 0 : undefined}
            max={isNumeric ? 99 : undefined}
            autoFocus
            className="bg-background border-input text-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(draft);
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            data-ocid="edit_cell.cancel_button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            data-ocid="edit_cell.save_button"
            onClick={() => onSave(draft)}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cell component ────────────────────────────────────────────────────────────

interface CellProps {
  value: string;
  placeholder?: string;
  isNumeric?: boolean;
  readOnly?: boolean;
  onEdit: (value: string) => void;
  rowIndex: number;
  colKey: string;
}

function Cell({
  value,
  placeholder = "",
  isNumeric = false,
  readOnly = false,
  onEdit,
  rowIndex,
  colKey,
}: CellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [colLabel] = useState(() => {
    const labels: Record<string, string> = {
      operation: "Operation",
      operatorName: "Operator Name",
      hr1: "1st Hour",
      hr2: "2nd Hour",
      hr3: "3rd Hour",
      hr4: "4th Hour",
      hr5: "5th Hour",
      hr6: "6th Hour",
      hr7: "7th Hour",
      hr8: "8th Hour",
      defectType: "Defect Type",
      noOfDefects: "No. of Defects",
      actionTaken: "Action Taken",
    };
    return labels[colKey] ?? colKey;
  });

  const longPress = useLongPress(() => {
    if (!readOnly) setEditOpen(true);
  }, 500);

  if (readOnly) {
    return (
      <td className="table-cell px-2 py-1.5 text-center text-xs text-muted-foreground select-none border-r border-border/40 min-w-[2rem]">
        {value}
      </td>
    );
  }

  return (
    <>
      <td
        className="table-cell px-2 py-1 border-r border-border/40 min-w-[5rem] cursor-pointer select-none"
        {...longPress}
        onClick={() => setEditOpen(true)}
        title="Tap or hold to edit"
      >
        <span
          className={`block text-xs truncate max-w-[8rem] ${value ? "text-foreground" : "text-muted-foreground/50"}`}
        >
          {value || placeholder}
        </span>
      </td>
      <EditCellDialog
        open={editOpen}
        fieldName={`Row ${rowIndex + 1} — ${colLabel}`}
        value={value}
        isNumeric={isNumeric}
        onSave={(v) => {
          onEdit(v);
          setEditOpen(false);
        }}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

// ─── QC Table ──────────────────────────────────────────────────────────────────

export interface QCTableProps {
  rows: QCRowData[];
  readOnly?: boolean;
  onChange?: (rowIndex: number, field: keyof QCRowData, value: string) => void;
  onCameraClick?: (rowIndex: number) => void;
}

export function QCTable({
  rows,
  readOnly = false,
  onChange,
  onCameraClick,
}: QCTableProps) {
  const hourCols: { key: keyof QCRowData; label: string }[] = [
    { key: "hr1", label: "1st Hr" },
    { key: "hr2", label: "2nd Hr" },
    { key: "hr3", label: "3rd Hr" },
    { key: "hr4", label: "4th Hr" },
    { key: "hr5", label: "5th Hr" },
    { key: "hr6", label: "6th Hr" },
    { key: "hr7", label: "7th Hr" },
    { key: "hr8", label: "8th Hr" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="qc-table w-full border-collapse text-sm">
        <thead>
          <tr className="bg-card/80 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
            <th className="px-2 py-2 text-center border-r border-border/40 min-w-[2rem] sticky left-0 bg-card/95 z-10">
              #
            </th>
            <th className="px-2 py-2 text-left border-r border-border/40 min-w-[7rem]">
              Operation
            </th>
            <th className="px-2 py-2 text-left border-r border-border/40 min-w-[8rem]">
              Operator
            </th>
            {hourCols.map((col) => (
              <th
                key={col.key}
                className="px-2 py-2 text-center border-r border-border/40 min-w-[3.5rem]"
              >
                {col.label}
              </th>
            ))}
            <th className="px-2 py-2 text-left border-r border-border/40 min-w-[7rem]">
              Defect Type
            </th>
            <th className="px-2 py-2 text-center border-r border-border/40 min-w-[3.5rem]">
              # Defects
            </th>
            <th className="px-2 py-2 text-left border-r border-border/40 min-w-[8rem]">
              Action Taken
            </th>
            {!readOnly && (
              <th className="px-2 py-2 text-center min-w-[2.5rem] sticky right-0 bg-card/95 z-10">
                📷
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const colorClass = getRowColor(row);
            const markerIndex = i + 1;
            return (
              <tr
                key={`qc-row-${i}-${row.operatorName}`}
                data-ocid={`report.row.item.${markerIndex}`}
                className={`border-b border-border/30 transition-colors ${colorClass}`}
              >
                {/* # */}
                <td className="px-2 py-1.5 text-center text-xs text-muted-foreground font-medium border-r border-border/40 sticky left-0 bg-inherit z-10">
                  {i + 1}
                </td>

                {/* Operation */}
                <Cell
                  value={row.operation}
                  placeholder="Operation"
                  onEdit={(v) => onChange?.(i, "operation", v)}
                  rowIndex={i}
                  colKey="operation"
                />

                {/* Operator Name */}
                <Cell
                  value={row.operatorName}
                  placeholder={`Operator ${i + 1}`}
                  onEdit={(v) => onChange?.(i, "operatorName", v)}
                  rowIndex={i}
                  colKey="operatorName"
                />

                {/* Hour columns */}
                {hourCols.map((col) => (
                  <Cell
                    key={col.key}
                    value={row[col.key] as string}
                    placeholder="0"
                    isNumeric
                    onEdit={(v) => onChange?.(i, col.key, v)}
                    rowIndex={i}
                    colKey={col.key}
                  />
                ))}

                {/* Defect Type */}
                <Cell
                  value={row.defectType}
                  placeholder="Type"
                  onEdit={(v) => onChange?.(i, "defectType", v)}
                  rowIndex={i}
                  colKey="defectType"
                />

                {/* No. of Defects */}
                <Cell
                  value={row.noOfDefects}
                  placeholder="0"
                  isNumeric
                  onEdit={(v) => onChange?.(i, "noOfDefects", v)}
                  rowIndex={i}
                  colKey="noOfDefects"
                />

                {/* Action Taken */}
                <Cell
                  value={row.actionTaken}
                  placeholder="Action"
                  onEdit={(v) => onChange?.(i, "actionTaken", v)}
                  rowIndex={i}
                  colKey="actionTaken"
                />

                {/* Camera button */}
                {!readOnly && (
                  <td className="px-1 py-1 text-center sticky right-0 bg-inherit z-10">
                    <button
                      type="button"
                      data-ocid={`report.row.camera_button.${markerIndex}`}
                      onClick={() => onCameraClick?.(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-accent/60 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors mx-auto"
                      aria-label={`Camera for row ${i + 1}`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
