# Task ID: p2-2
# Agent: Backend Subagent (full-stack-developer)
# Task: Create all backend API routes for SmartTicketS Phase 2 - Tickets Module

## Files Created

### 1. `src/lib/tickets.ts` — Ticket Business Logic Library
- `calculateLuggageFee(weightKg)` — max(0, ceil(weight - 15)) * 200 FCFA
- `generateControlCode()` — Unique 6-8 digit code with DB uniqueness check (10 retries)
- `generateQrHash()` — crypto.randomUUID()
- `generateTicketCode(index)` — TKT-{0001}
- `generateBatchId()` — crypto.randomUUID()
- `buildWhatsAppMessage(ticket, ticketCode)` — French WhatsApp message with ticket details, conditions, control code
- `buildWhatsAppLink(phone, message)` — wa.me URL with encoded message
- `validateChildRules(age, isChild, childDocument)` — Returns error if child <5 without document
- `validateReschedule(departureTime, rescheduleCount)` — Returns error if <24h or already rescheduled

### 2. `src/app/api/tickets/generate-batch/route.ts` — POST generate batch
- Auth: SUPER_ADMIN or ADMIN (with tenant access)
- Zod body: `{ lineId?, count: 1-500 }`
- Validates line belongs to tenant if lineId provided
- Counts existing tickets for sequential numbering
- Uses Prisma transaction for atomic batch creation
- Returns: `{ batchId, count, tickets: [{ id, ticketCode, qrHash }] }`

### 3. `src/app/api/tickets/activate/route.ts` — POST activate ticket
- Auth: OPERATOR, ADMIN, or SUPER_ADMIN
- Full Zod schema validation (phone regex, age 0-120, etc.)
- Business logic flow: find inactive preprinted → validate child → calculate fees → generate control code → transaction → WhatsApp message
- Returns full ticket + whatsappLink + controlCode

### 4. `src/app/api/tickets/route.ts` — GET list tickets
- Auth: OPERATOR, ADMIN, or SUPER_ADMIN
- Filters: search, status, dateFrom, dateTo, tenantId (SUPER_ADMIN only)
- Multi-tenant isolation enforced
- Pagination with total count
- Includes: preprintedTicket, line, departure, activatedBy

### 5. `src/app/api/tickets/[id]/route.ts` — GET single ticket
- Auth: OPERATOR, ADMIN, or SUPER_ADMIN
- Full relation includes (line with stations, departure, activatedBy, tenant)
- Multi-tenant isolation enforced

### 6. `src/app/api/tickets/[id]/reschedule/route.ts` — POST reschedule ticket
- Auth: OPERATOR, ADMIN, or SUPER_ADMIN
- Validates: active status, rescheduleCount <1, departureTime >=24h
- Validates new departure >=24h from now
- Updates status to "rescheduled", increments rescheduleCount

### 7. `src/app/api/tickets/[id]/use/route.ts` — POST mark ticket as used
- Auth: CONTROLLER, ADMIN, or SUPER_ADMIN
- Validates: active/rescheduled status
- Optional controlCode verification
- Also updates preprinted ticket status to "used"

## Business Rules Implemented
- ✅ Baggage fee: max(0, ceil(weight-15)) * 200 FCFA
- ✅ Child <5: free but requires childDocument (blocked if missing)
- ✅ Non-refundable: no refund endpoint
- ✅ Reschedule: only if >=24h before departure AND never rescheduled before
- ✅ Control code: unique 6-8 digit with DB collision retry
- ✅ QR hash: crypto.randomUUID()
- ✅ WhatsApp link: wa.me/{phone}?text={encoded}
- ✅ Multi-tenant isolation on ALL queries
- ✅ Audit logging on ALL mutations
- ✅ Zero ESLint errors
