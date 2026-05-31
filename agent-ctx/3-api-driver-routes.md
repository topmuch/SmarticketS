---
Task ID: 3
Agent: api-driver-routes
Task: Create PWA Chauffeur backend API routes (driver login, deliveries list, PIN-validated delivery)

Work Log:
- Created /api/driver/login/route.ts — POST endpoint for driver authentication
  - Zod validation for email/password
  - Finds user with role "driver", verifies with bcrypt.compare
  - Creates session via createSession(), logs attempt via logLoginAttempt()
  - Returns: user id, name, email, role, agencyId, agencyName
  - Error handling: 400 validation, 401 invalid credentials, 403 wrong role
- Created /api/driver/deliveries/route.ts — GET endpoint for driver parcel list
  - Authenticated via getSession(), verified role "driver"
  - Queries baggages where status=in_transit, agencyId=user.agencyId, category=parcel
  - Ordered by departureDate ASC
  - Returns masked phone (first4+***+last2) and masked PIN (***+last3)
- Created /api/driver/deliver/[id]/route.ts — POST endpoint for PIN-validated delivery
  - Authenticated via getSession(), verified role "driver"
  - Zod validation: 6-digit numeric PIN
  - Agency ownership check, in_transit status check
  - PIN verification with attempt tracking (max 3 attempts, auto-block on limit)
  - On success: updates status=delivered, deliveredAt, deliveredBy, pinVerified=true
  - Generates WhatsApp sender message (🟢 Colis Livré) and receiver message (🔵 Livraison Confirmée)
  - Creates wa.me links via cleanPhone + generateWaMeLink
  - Logs 3 ColisEvent entries (system, sender, receiver) for audit trail
  - Returns delivery info + wa_sender/wa_receiver links
- Lint: 0 errors on all 3 new files (pre-existing error in scripts/migrate-db.js unrelated)

Stage Summary:
- 3 API route files created for the PWA Chauffeur driver workflow
- Secure driver authentication with bcrypt password verification and session cookies
- Parcel listing with agency isolation and phone/PIN masking for privacy
- PIN-validated delivery with attempt limiting and auto-blocking
- WhatsApp notification generation (sender + receiver) with wa.me deep links
- Full ColisEvent audit trail for all delivery operations
