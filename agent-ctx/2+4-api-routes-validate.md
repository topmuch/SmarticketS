---
Task ID: 2+4
Agent: api-routes-validate
Task: Create /api/admin/routes and /api/validate-ticket API routes

Work Log:
- Created `/home/z/qrtrans-project/src/app/api/admin/routes/route.ts` with GET/POST/PUT/DELETE handlers
- Created `/home/z/qrtrans-project/src/app/api/validate-ticket/route.ts` with POST handler
- GET /api/admin/routes?agencyId=xxx — lists routes with agency isolation (agency role forced, superadmin optional filter)
- POST /api/admin/routes — creates route with Zod validation, agency ownership enforcement, agency existence check
- PUT /api/admin/routes — updates route (id in body), ownership enforcement for agency role
- DELETE /api/admin/routes?id=xxx — deletes route with departure count guard (409 if linked departures exist)
- POST /api/validate-ticket — validates ticket by controlCode with full status machine: ACTIVE→USED, CANCELLED→error, USED→error with details
- Ticket validation includes: optional session-based validator identity, transactional seat decrement on linked Departure, ColisEvent audit logging
- All routes use Zod for input validation, proper HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500)
- ESLint: 0 errors on both new files
- Appended work log to /home/z/qrtrans-project/worklog.md

Stage Summary:
- 2 API routes created
- Full CRUD for routes with agency multi-tenant isolation
- Ticket validation with status transition ACTIVE→USED
- Transactional operations with audit logging
- Proper error handling and HTTP status codes
