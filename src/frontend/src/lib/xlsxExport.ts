/**
 * Minimal XLSX export utility using the xlsx library loaded from CDN.
 * Falls back to CSV download if XLSX is unavailable.
 */

type CellValue = string | number | null | undefined;

export interface SheetRow {
  values: CellValue[];
  bgColor?: string; // hex e.g. "CCFFCC"
}

export async function exportAsXlsx(
  filename: string,
  sheetName: string,
  rows: SheetRow[],
): Promise<void> {
  // Try to load xlsx from CDN if not bundled
  let XLSX: any = (window as any).XLSX;

  if (!XLSX) {
    try {
      await loadXlsxFromCdn();
      XLSX = (window as any).XLSX;
    } catch {
      // Fallback to CSV
      exportAsCsv(filename, rows);
      return;
    }
  }

  const aoa: CellValue[][] = rows.map((r) => r.values);
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Try to apply fill colors
  try {
    rows.forEach((row, ri) => {
      if (!row.bgColor) return;
      const colCount = row.values.length;
      for (let ci = 0; ci < colCount; ci++) {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[addr]) ws[addr] = { v: "", t: "s" };
        ws[addr].s = {
          fill: { patternType: "solid", fgColor: { rgb: row.bgColor } },
        };
      }
    });
  } catch {
    /* cellStyles may not work in all builds */
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buf: ArrayBuffer = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

function loadXlsxFromCdn(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load xlsx"));
    document.head.appendChild(script);
  });
}

function exportAsCsv(filename: string, rows: SheetRow[]): void {
  const csv = rows
    .map((r) =>
      r.values
        .map((v) => {
          const s = String(v ?? "");
          return s.includes(",") || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, filename.replace(".xlsx", ".csv"));
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAsShareFile(
  filename: string,
  sheetName: string,
  rows: SheetRow[],
): Promise<File | null> {
  let XLSX: any = (window as any).XLSX;
  if (!XLSX) {
    try {
      await loadXlsxFromCdn();
      XLSX = (window as any).XLSX;
    } catch {
      return null;
    }
  }
  const aoa = rows.map((r) => r.values);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File(
    [
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ],
    filename,
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );
}
