# Task ID: 5 — Activation Page Redesign with 3 Colored Cards

## Summary
Redesigned the `/activate/[id]` activation page with exactly 3 colored cards, replaced manual phone inputs with SmartPhoneInput, added wa.me link support from API, and added PIN security warning.

## Files Modified (6 total)

### 1. VoyageSection.tsx — 🟦 Blue Card
- `bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-6`
- Title: 🚌 ITINÉRAIRE (text-blue-800)
- All inputs: bg-white border-blue-200 focus-visible:ring-blue-400
- Toggle selected: border-blue-500 bg-blue-500/5 text-blue-500

### 2. SenderSection.tsx — 🟧 Orange Card
- `bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-6`
- Title: 📤 EXPÉDITEUR (text-orange-800)
- Replaced manual phone input with SmartPhoneInput component
- Removed unused Phone icon import

### 3. ReceiverSection.tsx — 🟩 Green Card
- `bg-green-50 border-2 border-dashed border-green-300 rounded-2xl p-6`
- Title: 📥 DESTINATAIRE (text-green-800)
- Replaced manual phone input with SmartPhoneInput component
- Removed unused Phone icon import

### 4. ActivationHeader.tsx
- Subtitle: "Inscription d'un Colis" → "Activation du Colis"

### 5. ActivationForm.tsx
- Added waSenderUrl/waReceiverUrl state
- Success handler captures wa_sender/wa_receiver from API
- Passes wa.me URLs to SuccessScreen

### 6. SuccessScreen.tsx
- Added optional waSenderUrl/waReceiverUrl props
- Uses API links when available, fallback to createDepartureLinks()
- Added PIN warning banner

## Validation
- `bun run lint` → 0 errors
- 0 new files, 0 API changes
- All existing functionality preserved
