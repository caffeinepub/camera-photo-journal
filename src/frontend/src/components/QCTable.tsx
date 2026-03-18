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
import { getRowColorClass } from "@/db-qc";
import type { QCRowData } from "@/db-qc";
import { Camera } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ─── Column definitions ──────────────────────────────────────────────────────

const HOUR_FIELDS: Array<keyof QCRowData> = [
  "hr1",
  "hr2",
  "hr3",
  "hr4",
  "hr5",
  "hr6",
  "hr7",
  "hr8",
];

const HOUR_LABELS = [
  "1st Hr",
  "2nd Hr",
  "3rd Hr",
  "4th Hr",
  "5th Hr",
  "6th Hr",
  "7th Hr",
  "8th Hr",
];

const TEXT_FIELDS: Array<{ key: keyof QCRowData; label: string }> = [
  { key: "defectType", label: "Defect" },
  { key: "noOfDefects", label: "No." },
  { key: "actionTaken", label: "Action Taken" },
];

// ─── Long-press hook ──────────────────────────────────────────────────────────

function useLongPress(onLongPress: () => void, delay = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (e.type === "touchstart") e.preventDefault();
      timerRef.current = setTimeout(() => {
        onLongPress();
      }, delay);
    },
    [onLongPress, delay],
  );

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
  const prevRef = useRef(value);
  if (prevRef.current !== value) {
    prevRef.current = value;
    setDraft(value);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xs" data-ocid="edit_cell.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {fieldName}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Value
          </Label>
          <Input
            autoFocus
            type={isNumeric ? "number" : "text"}
            min={isNumeric ? 0 : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(draft);
            }}
            className="font-mono text-sm"
            data-ocid="edit_cell.input"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="edit_cell.cancel_button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(draft)}
            data-ocid="edit_cell.save_button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Photo Viewer ───────────────────────────────────────────────────────────────────

function PhotoViewer({
  open,
  dataUrl,
  timestamp,
  onClose,
}: {
  open: boolean;
  dataUrl: string;
  timestamp?: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm p-2" data-ocid="photo_viewer.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {timestamp ? new Date(timestamp).toLocaleString() : "Captured"}
          </DialogTitle>
        </DialogHeader>
        <img src={dataUrl} alt="QC defect capture" className="w-full rounded" />
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          data-ocid="photo_viewer.close_button"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── QC Cell (td + long press) ────────────────────────────────────────────────────

function QCCell({
  value,
  fieldName,
  isNumeric = false,
  onEdit,
}: {
  value: string;
  fieldName: string;
  isNumeric?: boolean;
  onEdit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const lp = useLongPress(() => setEditing(true));
  return (
    <td className="border-r border-border/30 text-center">
      <div className="qc-cell" {...lp} title="Long-press to edit">
        {value || <span className="text-muted-foreground/40 text-xs">—</span>}
      </div>
      <EditCellDialog
        open={editing}
        fieldName={fieldName}
        value={value}
        isNumeric={isNumeric}
        onSave={(v) => {
          onEdit(v);
          setEditing(false);
        }}
        onClose={() => setEditing(false)}
      />
    </td>
  );
}

// ─── Sticky cell (inside existing td) ──────────────────────────────────────────────

function StickyCell({
  value,
  fieldName,
  onEdit,
}: {
  value: string;
  fieldName: string;
  onEdit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const lp = useLongPress(() => setEditing(true));
  return (
    <>
      <div className="qc-cell font-mono" {...lp} title="Long-press to edit">
        {value || <span className="text-muted-foreground/40">—</span>}
      </div>
      <EditCellDialog
        open={editing}
        fieldName={fieldName}
        value={value}
        isNumeric={false}
        onSave={(v) => {
          onEdit(v);
          setEditing(false);
        }}
        onClose={() => setEditing(false)}
      />
    </>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────────

interface QCRowProps {
  row: QCRowData;
  rowIndex: number;
  readOnly: boolean;
  onEdit: (field: keyof QCRowData, value: string) => void;
  onCameraClick?: () => void;
  onPhotoView?: (dataUrl: string, timestamp?: number) => void;
}

function QCRow({
  row,
  rowIndex,
  readOnly,
  onEdit,
  onCameraClick,
  onPhotoView,
}: QCRowProps) {
  const colorCls = getRowColorClass(row);
  return (
    <tr className={`border-b border-border/20 ${colorCls}`}>
      {/* Operation — sticky col 1 */}
      <td className="sticky-col-1 border-r border-border/30 px-1 py-0">
        {readOnly ? (
          <span className="block px-1 py-1 font-mono text-xs">
            {row.operation || "—"}
          </span>
        ) : (
          <StickyCell
            value={row.operation}
            fieldName="Operation"
            onEdit={(v) => onEdit("operation", v)}
          />
        )}
      </td>

      {/* Operator — sticky col 2 */}
      <td className="sticky-col-2 border-r border-border/30 px-1 py-0">
        {readOnly ? (
          <span className="block px-1 py-1 font-mono text-xs">
            {row.operatorName || "—"}
          </span>
        ) : (
          <StickyCell
            value={row.operatorName}
            fieldName="Operator Name"
            onEdit={(v) => onEdit("operatorName", v)}
          />
        )}
      </td>

      {/* Hour columns */}
      {HOUR_FIELDS.map((field, hi) =>
        readOnly ? (
          <td
            key={field}
            className="border-r border-border/30 text-center px-1 py-1 font-mono"
          >
            {(row[field] as string) || "—"}
          </td>
        ) : (
          <QCCell
            key={field}
            value={row[field] as string}
            fieldName={`${HOUR_LABELS[hi]} Defects`}
            isNumeric
            onEdit={(v) => onEdit(field, v)}
          />
        ),
      )}

      {/* Text fields */}
      {TEXT_FIELDS.map(({ key, label }) =>
        readOnly ? (
          <td
            key={key}
            className="border-r border-border/30 px-1 py-1 max-w-[110px]"
          >
            <span className="block truncate font-mono">
              {(row[key] as string) || "—"}
            </span>
          </td>
        ) : (
          <QCCell
            key={key}
            value={row[key] as string}
            fieldName={label}
            isNumeric={key === "noOfDefects"}
            onEdit={(v) => onEdit(key, v)}
          />
        ),
      )}

      {/* Photo column */}
      <td className="text-center px-1 py-0">
        {row.photoDataUrl ? (
          <button
            type="button"
            onClick={() => onPhotoView?.(row.photoDataUrl!, row.photoTimestamp)}
            className="p-1 rounded hover:bg-accent/40 transition-colors"
            title="View capture"
            data-ocid={`photo.item.${rowIndex + 1}`}
          >
            <img
              src={row.photoDataUrl}
              alt={`Row ${rowIndex + 1} defect capture`}
              className="w-8 h-8 object-cover rounded"
            />
          </button>
        ) : !readOnly && onCameraClick ? (
          <button
            type="button"
            onClick={onCameraClick}
            className="p-1 rounded hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground"
            title="Take capture"
            data-ocid={`camera.item.${rowIndex + 1}`}
          >
            <Camera className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-muted-foreground/30 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── QC Table ─────────────────────────────────────────────────────────────────

export interface QCTableProps {
  rows: QCRowData[];
  readOnly?: boolean;
  onCellChange?: (
    rowIndex: number,
    field: keyof QCRowData,
    value: string,
  ) => void;
  onCameraClick?: (rowIndex: number) => void;
}

export function QCTable({
  rows,
  readOnly = false,
  onCellChange,
  onCameraClick,
}: QCTableProps) {
  const [photoViewer, setPhotoViewer] = useState<{
    dataUrl: string;
    timestamp?: number;
  } | null>(null);

  return (
    <div
      className="overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="text-xs border-collapse" style={{ minWidth: 900 }}>
        <thead>
          <tr className="bg-muted/80">
            <th
              className="sticky-col-1 text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap"
              style={{ minWidth: 80 }}
            >
              Operation
            </th>
            <th
              className="sticky-col-2 text-left px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap"
              style={{ minWidth: 110 }}
            >
              Operator
            </th>
            {HOUR_LABELS.map((label) => (
              <th
                key={label}
                className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap text-center"
                style={{ minWidth: 54 }}
              >
                {label}
              </th>
            ))}
            <th
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap"
              style={{ minWidth: 80 }}
            >
              Defect
            </th>
            <th
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap text-center"
              style={{ minWidth: 52 }}
            >
              No.
            </th>
            <th
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide border-r border-border/30 whitespace-nowrap"
              style={{ minWidth: 110 }}
            >
              Action Taken
            </th>
            <th
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap text-center"
              style={{ minWidth: 50 }}
            >
              Photo
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <QCRow
              // biome-ignore lint/suspicious/noArrayIndexKey: row order is stable by design
              key={i}
              row={row}
              rowIndex={i}
              readOnly={readOnly}
              onEdit={(field, value) => onCellChange?.(i, field, value)}
              onCameraClick={onCameraClick ? () => onCameraClick(i) : undefined}
              onPhotoView={(dataUrl, ts) =>
                setPhotoViewer({ dataUrl, timestamp: ts })
              }
            />
          ))}
        </tbody>
      </table>

      {photoViewer && (
        <PhotoViewer
          open
          dataUrl={photoViewer.dataUrl}
          timestamp={photoViewer.timestamp}
          onClose={() => setPhotoViewer(null)}
        />
      )}
    </div>
  );
}
