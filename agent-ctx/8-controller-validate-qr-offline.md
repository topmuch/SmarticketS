# Task — Rewrite Controller Validate Page with QR Scanner & Offline Queue

## Agent: controller-validate-page-v2

## Files Modified
1. `/src/app/controller/validate/page.tsx` — Complete rewrite of the controller validation page

## Files Unchanged (already existed)
- `/src/lib/offline/queue.ts` — IndexedDB sync queue (all exports already present: `addToSyncQueue`, `getQueueStats`, `isOfflineStorageAvailable`)
- `/src/lib/offline/sync.ts` — Sync engine singleton (all exports already present: `syncEngine`, `startSyncEngine`, `stopSyncEngine`)

## Summary of Changes

### 1. QR Camera Scanner
- Integrated `Html5Qrcode` from `html5-qrcode` library
- Camera starts automatically when user switches to Scanner mode
- Camera stops when switching back to Keypad mode or on component unmount
- Extracts numeric 6-8 digit codes from QR text (handles both pure numeric and URL-embedded codes)
- Auto-triggers validation on successful scan
- Dark viewport with rounded corners and overlay hint ("Pointez le QR code...")
- Uses `facingMode: 'environment'` for rear camera

### 2. Input Mode Toggle
- Added `InputMode` type: `'keypad' | 'camera'` (default: `'keypad'`)
- Segmented control UI between agency selector and code display
- Two toggle buttons: "Clavier" (with numpad SVG icon) and "Scanner" (with ScanLine icon)
- Active mode highlighted with emerald accent background

### 3. Offline Queue Integration
- `startSyncEngine()` called on mount, `stopSyncEngine()` on unmount
- Subscribed to `syncEngine` events for real-time pending count updates
- Initial queue stats fetched on mount
- Network error in validation → automatically queued via `addToSyncQueue()`
- New `queued` validation status with sky-blue themed result card
- "ENREGISTRÉ HORS LIGNE" message with auto-sync explanation

### 4. Online/Offline Status Indicator
- Header badge with `Wifi` (green) / `WifiOff` (red) icons
- Text "En ligne" / "Hors ligne" shown on larger screens
- Listens to browser `online`/`offline` events

### 5. Pending Sync Counter
- Footer shows pending count badge when items are queued
- "En attente : N" label with amber background
- "Synchronisation..." animated indicator when sync is active
- `CloudCheck` (pulsing) during sync, `CloudOff` when pending

### 6. Refactored Architecture
- Extracted `validateWithCode(code)` shared by both keypad and camera
- Extracted `ResultCard` sub-component to avoid duplication
- Extracted `Spinner` component for loading states
- Used `selectedAgencyIdRef` to avoid stale closures in async callbacks
- Proper scanner lifecycle management with `scannerStartingRef` guard
- All existing features preserved: agency selector, code display, audio feedback, haptic, auto-clear, keyboard support, stats bar
