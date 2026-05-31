/**
 * SmarticketS - Runtime Database Migration Script
 * 
 * Adds missing columns to existing SQLite database using raw SQL via Prisma.
 * This runs BEFORE the Next.js server starts, ensuring schema is always in sync.
 * 
 * Safe: uses try-catch per column so it's idempotent.
 * Must be run from /app directory where full node_modules is available.
 */

const { PrismaClient } = require('@prisma/client');

const MIGRATIONS = [
  // EmailSettings columns
  { table: 'EmailSettings', column: 'recipientColisEmail', type: 'TEXT' },
  { table: 'EmailSettings', column: 'recipientSystemEmail', type: 'TEXT' },
  { table: 'EmailSettings', column: 'lastTestAt', type: 'DATETIME' },
  { table: 'EmailSettings', column: 'lastTestStatus', type: 'TEXT' },
  { table: 'EmailSettings', column: 'lastTestError', type: 'TEXT' },
  { table: 'EmailSettings', column: 'isActive', type: 'BOOLEAN DEFAULT 1' },

  // Baggage columns
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

  // ScanLog columns
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

async function migrate() {
  console.log('    Connecting to database...');
  
  const prisma = new PrismaClient();

  try {
    // Get list of existing tables
    const tables = await prisma.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const tableSet = new Set(tables.map(t => t.name));

    let totalAdded = 0;
    let totalSkipped = 0;

    console.log(`    Found ${tableSet.size} existing tables`);

    for (const mig of MIGRATIONS) {
      if (!tableSet.has(mig.table)) {
        totalSkipped++;
        continue; // Table doesn't exist yet, Prisma will create it
      }

      // Get existing columns for this table
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${mig.table}")`);
      const colSet = new Set(columns.map(c => c.name));

      if (colSet.has(mig.column)) {
        continue; // Column already exists
      }

      // Add missing column
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${mig.table}" ADD COLUMN "${mig.column}" ${mig.type}`
        );
        console.log(`    ✅ Added ${mig.table}.${mig.column} (${mig.type})`);
        totalAdded++;
      } catch (e) {
        console.log(`    ⚠️  ${mig.table}.${mig.column}: ${e.message}`);
      }
    }

    console.log(`    ✅ Migration complete: ${totalAdded} columns added, ${totalSkipped} tables skipped`);

  } catch (error) {
    console.error(`    ❌ Migration error: ${error.message}`);
    // Don't exit with error code — let the server try to start anyway
    // (prisma db push should have already created tables from scratch)
  } finally {
    await prisma.$disconnect();
  }
}

migrate().then(() => process.exit(0)).catch((e) => {
  console.error(`    ❌ Migration script crashed: ${e.message}`);
  process.exit(0); // Exit 0 so the CMD chain continues to start the server
});
