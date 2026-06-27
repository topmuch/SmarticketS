import { NextResponse } from 'next/server';

/**
 * @deprecated DEAD ROUTE — references non-existent Prisma models.
 *
 * FIX (audit #8): this route previously used @ts-nocheck to hide that it
 * referenced models like PreprintedTicket, Line, Parcel, pinHash, etc.
 * that don't exist in the current schema. It would crash with a 500 error
 * if ever called.
 *
 * Replaced with a 410 Gone stub. The original code is preserved in git history.
 * If you need this functionality, rewrite it using the live schema models
 * (PassengerTicket, Departure, Baggage, BusGoNotificationLog, etc.).
 */
export async function GET() {
  return NextResponse.json(
    { error: 'This route is deprecated and no longer functional.', deprecated: true },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This route is deprecated and no longer functional.', deprecated: true },
    { status: 410 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'This route is deprecated and no longer functional.', deprecated: true },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This route is deprecated and no longer functional.', deprecated: true },
    { status: 410 }
  );
}
