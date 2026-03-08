# Garment QC Report App

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- QC Inspector login (single inspector account)
- Report creation screen with a spreadsheet-style table:
  - Columns: Operation, Operator Name, 1st Hour, 2nd Hour, 3rd Hour, 4th Hour, 5th Hour, 6th Hour, 7th Hour, 8th Hour, Defect Type, No. of Defects, Action Taken
  - 30 operator rows per report
  - Row color coding:
    - Green: 0 total defects across all 8 hours
    - Yellow: exactly 1 defect across all 8 hours
    - Red: 2 or more defects across all 8 hours
  - Long-press (500ms hold) on any cell opens an inline edit modal
- Camera capture feature (optional autofill):
  - Opens device camera to photograph a defect tag or handwritten sheet
  - Attempts OCR-style extraction to autofill Defect Type, No. of Defects, Action Taken fields for a selected row
  - User can confirm or discard autofill suggestions
- Report submission:
  - Saves report with timestamp (date + time) to app storage (IndexedDB)
  - Report is immutable once submitted
- Reports list screen:
  - Shows all saved reports ordered by submission date/time (newest first)
  - Tap to view any past report in read-only mode
  - Download as .xlsx Excel file (using SheetJS/xlsx library)
  - Share via Web Share API (share the xlsx file)
- Navigation: tab bar with "New Report" and "Reports" tabs

### Modify
- Project renamed to "Garment QC Report"

### Remove
- Nothing (new project)

## Implementation Plan
1. Backend: store reports (id, timestamp, rows array), list reports, get report by id, delete report
2. Frontend: auth gate (inspector login), new report form with 30-row table, row color logic, long-press edit modal, camera capture + autofill suggestion UI, submit action, reports list, report viewer, xlsx download, Web Share API share button
3. Use SheetJS (xlsx) library in frontend for Excel export
4. Camera component from Caffeine for live capture
5. PWA manifest for installability on Android
