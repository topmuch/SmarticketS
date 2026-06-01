---
Task ID: 1
Agent: Main Agent
Task: Implement "Passager Manquant" (Missing Passenger Alert) feature for SmarticketS Dashboard

Work Log:
- Read Prisma schema to understand PassengerTicket, Departure, and Baggage models
- Fixed 3 existing API routes that had invalid `getSession(req)` calls (changed to `getSession()`)
- Created `src/lib/missing-passengers.ts` with 3 functions: getMissingPassengers(), scanAgencyForMissingAlerts(), markPassengerPresent()
- Updated `src/lib/auto-seed.ts` with demo PassengerTicket + Baggage data (7 passengers, 3 validated, 4 missing) and a departure scheduled 10 min from now
- Created public demo API endpoint `GET /api/demo/missing-passengers` (no auth required)
- Created public demo API endpoint `POST /api/demo/mark-present` (no auth required)
- Created `src/components/dashboard/MissingPassengerAlert.tsx` — full React component with:
  - AlertBanner (red gradient, pulse animation, missing count badge)
  - TripAlertCard (per-departure card with progress bar, expand/collapse)
  - Missing passengers table with seat, name, phone, control code
  - 📞 Contacter (WhatsApp) and ✅ Marquer Présent buttons
  - Empty state (all passengers validated)
  - 30-second auto-polling
  - Loading spinner overlay during mark-present
- Integrated into `src/app/page.tsx` as "Alertes Temps Réel" section with dynamic import
- Fixed pre-existing AlertCenter.tsx bugs (missing </p> tag, missing Info import)
- Ran full comprehensive test suite — ALL 4 TESTS PASSED:
  1. ✅ Health check (HTTP 200)
  2. ✅ Missing passengers detected (7 sold, 5 scanned, 2 missing, 5 min before departure)
  3. ✅ Mark present works (Mariama Sy validated successfully)
  4. ✅ State updates reflected (2→1 remaining missing after mark)
- Lint: 0 new errors (only 1 pre-existing in scripts/migrate-db.js)

Stage Summary:
- Feature "Passager Manquant" fully implemented and tested at runtime
- Backend: 3 authenticated API endpoints + 2 public demo endpoints + 1 lib module
- Frontend: MissingPassengerAlert component with real-time polling, responsive design
- Demo data auto-seeds on first request (7 passengers, 3 validated, 4 missing)
- All API endpoints return HTTP 200 with correct data
- Mark-present correctly updates ticket status and decrements available seats

---
Task ID: 2
Agent: Main Agent
Task: MODULE 1 — Security Audit & Hardening of Authentication System

Work Log:
- Conducted full security audit of 15 auth-related files
- Identified 10 critical and 8 medium security vulnerabilities
- Created `src/lib/validation.ts` — shared Zod schemas for all auth endpoints:
  - loginSchema (email format + password min 8 chars)
  - emailOnlySchema (forgot-password, resend-verification)
  - verifyEmailSchema (token XOR code+email with .refine())
  - resetPasswordSchema (password complexity: uppercase + lowercase + digit)
  - staffLoginSchema (phone + 4-digit code)
  - Generic validateBody() helper
- Created `src/lib/rate-limiter.ts` — in-memory sliding window rate limiter:
  - Login: 5 attempts / 15 min per email
  - Forgot password: 3 / hour per email
  - Verify email: 5 / 15 min per email
  - Reset password: 3 / hour per email
  - Staff login: 5 / 15 min per phone
  - Generic IP: 20 / min
  - Auto-cleanup every 5 minutes
- Rewrote `src/app/api/auth/login/route.ts` with Zod + rate limiting + IP check
- Rewrote `src/app/api/auth/forgot-password/route.ts` with Zod + rate limiting
- Rewrote `src/app/api/auth/reset-password/route.ts` with Zod + rate limiting + session invalidation
- Rewrote `src/app/api/auth/verify-email/route.ts` with Zod + rate limiting + persists emailVerified
- Rewrote `src/app/api/auth/resend-verification/route.ts` with Zod + rate limiting
- Rewrote `src/middleware.ts` — now protects /admin/* and /agence/* pages server-side
- Added auth checks to ALL 4 endpoints in `src/app/api/agence/staff/route.ts` (GET, POST, PATCH, DELETE)
  - Added requireStaffAccess() guard function
  - Agency isolation on all operations
  - Audit logs with actorId tracking
- Added `emailVerified DateTime?` field to User model in Prisma schema
- Fixed `src/lib/email.ts`: Math.random() → crypto.randomInt() for code generation
- Session invalidation on password change (deleteMany sessions after reset)

Runtime Tests — ALL PASSED:
1. ✅ Empty body → 400 (Zod validation)
2. ✅ Invalid email → 400 (Zod validation)
3. ✅ Weak password → 400 (min 8 chars)
4. ✅ Wrong password → 401 (anti-enumeration)
5. ✅ Correct login → 200 with user data
6. ✅ Rate limit: attempt 6 → 429 (blocked)
7. ✅ Rate limit: attempt 7 → 429 (still blocked)
8. ✅ Bad forgot-password email → 400
9. ✅ Weak reset password → 400 (complexity)
10. ✅ Staff GET without auth → 401 (was UNPROTECTED before!)
- Lint: 0 new errors

Stage Summary:
- 10 files modified, 2 files created
- 5 auth endpoints hardened with Zod validation
- 5 auth endpoints hardened with rate limiting
- 1 critical auth gap fixed (staff/route.ts was completely unprotected)
- Server-side middleware now protects admin/agency pages
- Email verification now persists to DB (was a no-op)
- Password change now invalidates all sessions
- crypto.randomInt replaces Math.random in email code generation
