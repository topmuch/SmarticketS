/**
 * SmarticketS — Server Instrumentation
 *
 * Runs once at server startup (before any API route or page is served).
 * Ensures all required database columns exist via raw SQL ALTER TABLE.
 *
 * ⚠️  CRITICAL: This file MUST NEVER throw an unhandled error.
 *    If register() throws, the entire Next.js server fails to start,
 *    causing Internal Server Error on ALL pages including login.
 */

const REQUIRED_COLUMNS: { table: string; column: string; type: string }[] = [
  // ── EmailSettings ──
  { table: 'EmailSettings', column: 'recipientColisEmail', type: 'TEXT' },
  { table: 'EmailSettings', column: 'recipientSystemEmail', type: 'TEXT' },
  { table: 'EmailSettings', column: 'lastTestAt', type: 'DATETIME' },
  { table: 'EmailSettings', column: 'lastTestStatus', type: 'TEXT' },
  { table: 'EmailSettings', column: 'lastTestError', type: 'TEXT' },
  { table: 'EmailSettings', column: 'isActive', type: 'BOOLEAN DEFAULT 1' },

  // ── Baggage ──
  { table: 'Baggage', column: 'transportMode', type: "TEXT DEFAULT 'flight'" },
  { table: 'Baggage', column: 'trainCompany', type: 'TEXT' },
  { table: 'Baggage', column: 'trainNumber', type: 'TEXT' },
  { table: 'Baggage', column: 'shipName', type: 'TEXT' },
  { table: 'Baggage', column: 'shipCabin', type: 'TEXT' },
  { table: 'Baggage', column: 'busCompany', type: 'TEXT' },
  { table: 'Baggage', column: 'busLineNumber', type: 'TEXT' },
  { table: 'Baggage', column: 'departureCity', type: 'TEXT' },
  { table: 'Baggage', column: 'departureDate', type: 'DATETIME' },
  { table: 'Baggage', column: 'departureTime', type: 'TEXT' },
  { table: 'Baggage', column: 'receiverName', type: 'TEXT' },
  { table: 'Baggage', column: 'receiverWhatsapp', type: 'TEXT' },
  { table: 'Baggage', column: 'arrivedAt', type: 'DATETIME' },
  { table: 'Baggage', column: 'deliveryLocation', type: 'TEXT' },
  { table: 'Baggage', column: 'deliveryNotes', type: 'TEXT' },
  { table: 'Baggage', column: 'deliveredAt', type: 'DATETIME' },
  { table: 'Baggage', column: 'pickupAddress', type: 'TEXT' },
  { table: 'Baggage', column: 'estimatedArrival', type: 'TEXT' },
  { table: 'Baggage', column: 'paymentStatus', type: "TEXT DEFAULT 'SENDER_PAID'" },
  { table: 'Baggage', column: 'colisType', type: 'TEXT' },
  { table: 'Baggage', column: 'colisTypeOther', type: 'TEXT' },
  { table: 'Baggage', column: 'colisWeight', type: 'REAL' },
  { table: 'Baggage', column: 'colisDimensions', type: 'TEXT' },
  { table: 'Baggage', column: 'colisColor', type: 'TEXT' },
  { table: 'Baggage', column: 'contentCategory', type: 'TEXT' },
  { table: 'Baggage', column: 'declaredValue', type: 'REAL' },
  { table: 'Baggage', column: 'isFragile', type: 'BOOLEAN DEFAULT 0' },
  { table: 'Baggage', column: 'hasProhibited', type: 'BOOLEAN DEFAULT 0' },
  { table: 'Baggage', column: 'driverPhone', type: 'TEXT' },
  { table: 'Baggage', column: 'shareDriverPhone', type: 'BOOLEAN DEFAULT 0' },
  { table: 'Baggage', column: 'retrievalPin', type: 'TEXT' },
  { table: 'Baggage', column: 'pinVerified', type: 'BOOLEAN DEFAULT 0' },
  { table: 'Baggage', column: 'pinAttempts', type: 'INTEGER DEFAULT 0' },
  { table: 'Baggage', column: 'pinGeneratedAt', type: 'DATETIME' },
  { table: 'Baggage', column: 'declaredLostAt', type: 'DATETIME' },
  { table: 'Baggage', column: 'foundAt', type: 'DATETIME' },
  { table: 'Baggage', column: 'founderName', type: 'TEXT' },
  { table: 'Baggage', column: 'founderPhone', type: 'TEXT' },
  { table: 'Baggage', column: 'founderAt', type: 'DATETIME' },

  // ── ScanLog ──
  { table: 'ScanLog', column: 'whatsappStatus', type: 'TEXT' },
  { table: 'ScanLog', column: 'aiAnalysis', type: 'TEXT' },
  { table: 'ScanLog', column: 'groqUsed', type: 'BOOLEAN DEFAULT 0' },
  { table: 'ScanLog', column: 'groqLatencyMs', type: 'INTEGER' },
  { table: 'ScanLog', column: 'aiMessageUsed', type: 'BOOLEAN DEFAULT 0' },
  { table: 'ScanLog', column: 'groqModelUsed', type: 'TEXT' },
  { table: 'ScanLog', column: 'wakitMessageId', type: 'TEXT' },
  { table: 'ScanLog', column: 'context', type: 'TEXT' },
  { table: 'ScanLog', column: 'finderName', type: 'TEXT' },
  { table: 'ScanLog', column: 'finderPhone', type: 'TEXT' },
];

export async function register() {
  // ⚠️  This outer try/catch MUST catch everything.
  //    An unhandled rejection here prevents the Next.js server from
  //    starting → Internal Server Error on every page.
  try {
    // Only run in Node.js runtime (not Edge runtime)
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
      return;
    }

    console.log('[instrumentation] Starting database schema sync…');

    // Dynamic import so we don't crash if @prisma/client is missing
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      const tableSet = new Set(tables.map((t) => t.name));

      if (tableSet.size === 0) {
        console.log('[instrumentation] No tables found — Prisma will create them on first query');
        return;
      }

      let added = 0;

      for (const col of REQUIRED_COLUMNS) {
        if (!tableSet.has(col.table)) continue;

        try {
          const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `PRAGMA table_info("${col.table}")`
          );
          const colSet = new Set(columns.map((c) => c.name));

          if (colSet.has(col.column)) continue;

          await prisma.$executeRawUnsafe(
            `ALTER TABLE "${col.table}" ADD COLUMN "${col.column}" ${col.type}`
          );
          added++;
          console.log(`[instrumentation] Added ${col.table}.${col.column}`);
        } catch (colErr: unknown) {
          const msg = colErr instanceof Error ? colErr.message : String(colErr);
          console.error(`[instrumentation] Skipped ${col.table}.${col.column}: ${msg}`);
        }
      }

      if (added > 0) {
        console.log(`[instrumentation] Schema sync complete — ${added} column(s) added`);
      } else {
        console.log('[instrumentation] Schema already up to date');
      }
    } finally {
      await prisma.$disconnect().catch(() => {});
    }

    console.log('[instrumentation] Ready ✓');
  } catch (err: unknown) {
    // Swallow ALL errors — log but NEVER rethrow
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[instrumentation] Non-fatal error (server will continue): ${msg}`);
  }
}
