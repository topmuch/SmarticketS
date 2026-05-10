---
Task ID: 1
Agent: Main Agent
Task: Create /suivi/[reference] public tracking page + API + scan context detection + WhatsApp pre-filled message generator

Work Log:
- Cloned qrbags repo from GitHub to restore previous session's work
- Updated Prisma schema: added `context`, `finderName`, `finderPhone` fields to ScanLog model
- Pushed schema with `bunx --bun prisma db push`
- Created `src/lib/scan-context.ts` with `detectScanContext()` — 4 contexts (departure/arrival/transit/static)
- Created `src/lib/whatsapp-message.ts` with `generatePreFilledMessage()` + `buildWhatsAppUrl()`
- Created `/api/suivi/[reference]/route.ts` — GET endpoint with rate limiting, data filtering (no email/owner phone/raw GPS)
- Updated `/api/scan/[reference]/route.ts` POST — saves context, finderName, finderPhone to ScanLog
- Created `/suivi/[reference]/page.tsx` — Full Design Billet Premium tracking page
- Updated `src/lib/logger.ts` — added 'suivi' to logMetric service type
- Added i18n keys (tracking.*) + finder context keys to FR/EN/AR locales

Self-Critique (3 bugs found & fixed):
1. `logMetric('suivi', ...)` — type error: 'suivi' not in union type → Fixed by adding 'suivi' to logger.ts
2. `ContextBadge` had dead `t === (() => '')()` comparison → Removed, used i18n key mapping instead
3. `fetchSuivi(showLoading)` logic inverted — initial load showed refresh spinner, manual refresh didn't → Fixed parameter semantics
4. Dead `lastScan` variable declared but unused in main render → Removed
5. `data.status === 'error'` not caught → Added to error guard
6. `isDeclaredLost` could be truthy with empty string → Added `!!` coercion
7. `window.open() ||` unused expression lint warning → Replaced with explicit null check
8. Unused imports `Luggage`, `User` → Removed

Stage Summary:
- 6 new files created, 3 existing files modified
- Zero TS errors, zero lint errors in all new/modified files
- Design 100% consistent with scan page (white bg, blue blocks, dashed borders, orange buttons)
- Security: API never exposes email, owner WhatsApp, raw GPS coordinates
- Google Maps iframe with lat/lon priority, address fallback, placeholder for unavailable
- i18n complete: FR, EN, AR with all tracking.* keys
- WhatsApp pre-filled message: 4 contextual scenarios, <400 chars, emoji formatting

---
Task ID: 2
Agent: Main Agent (Self-Critique Round)
Task: Comprehensive audit and bug fix of /suivi feature

Work Log:
- Read and audited all 10 files: prisma schema, scan-context.ts, whatsapp-message.ts, suivi API route, suivi page, scan API route, logger.ts, fr/en/ar locales, scan page
- Ran `npx tsc --noEmit` — zero new errors (only pre-existing errors in admin/agence/success files)
- Ran `bun run lint` — zero errors
- Found BUG #1: Context dropdown missing from finder form (i18n keys existed but no <select> UI element)
- Found BUG #2: `selectedContext` missing from `handleWhatsApp` useCallback dependency array (stale closure)
- Found BUG #3: `selectedContext` missing from `handlePhoneCall` useCallback dependency array (stale closure)
- Found UX BUG #4: Found badge showed "VOTRE BAGAGE EST PROTÉGÉ" instead of "BAGAGE RETROUVÉ" — missing `badge_found` i18n key
- Fixed all 4 bugs

Stage Summary:
- Context dropdown now visible in finder form between WhatsApp input and Contact Buttons
- Both `handleWhatsApp` and `handlePhoneCall` now correctly send `context` in POST body
- `selectedContext` added to both dependency arrays (no stale closures)
- Added `tracking.badge_found` key to FR ("BAGAGE RETROUVÉ"), EN ("BAGGAGE FOUND"), AR ("تم العثور على الأمتعة")
- Badge logic now shows: lost → 🚨 badge_lost, found → ✅ badge_found, active → badge_active ✈️
- All pre-existing TS errors documented as out-of-scope (admin routes, agence layout, success page, etc.)
