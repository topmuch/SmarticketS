import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List agencies for controller dropdown (no auth required for simplicity)
export async function GET() {
  try {
    const agencies = await db.agency.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error('[/api/controller/agencies] Error:', error);
    return NextResponse.json(
      { agencies: [] },
      { status: 500 },
    );
  }
}
