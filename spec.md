# Garment QC Report

## Current State
New build. No existing application files.

## Requested Changes (Diff)

### Add
- QC report table with columns: Operation, Operator Name, Hour 1-8 (defect count per hour), Defect, No. of Defects, Action Taken
- Row color coding: Green = 0 total defects across hours, Yellow = exactly 1 defect, Red = 2+ defects
- Per-row camera capture: take a live photo attached to that operator's row, auto-stamped with date/time
- Photo stored with row and visible when viewing saved report
- Long-press (500ms hold) on any cell to enter edit mode
- Auto-save draft to localStorage so reopening resumes the last unfinished report
- Report submission saves to IndexedDB with submitted date/time
- Report history list: view all saved reports
- Download report as Excel (.xlsx) file
- Share report via Web Share API

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Backend: store reports (operator rows, photos as base64, timestamps), list reports, delete report
2. Frontend report editor: scrollable table with fixed header, inline cell editing on long-press, hour input fields, color-coded rows
3. Camera modal: open camera, capture photo, attach to row with date/time stamp
4. Draft persistence: auto-save table state to localStorage on every change, restore on load
5. Report history page: list submitted reports sorted by date, tap to view, download as Excel, share
6. Excel export: use SheetJS (xlsx) library to build and download .xlsx file
7. PWA manifest for Android home screen install
