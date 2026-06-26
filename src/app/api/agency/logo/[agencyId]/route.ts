import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;
    const agency = await db.agency.findUnique({
      where: { id: agencyId },
      select: { logoUrl: true },
    });

    if (!agency || !agency.logoUrl) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.redirect(new URL(agency.logoUrl, request.url));
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
