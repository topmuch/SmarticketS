import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET - Fetch agency profile
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId') || session.agencyId;

    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== agencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    const agency = await db.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        active: true,
        createdAt: true,
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agency });

  } catch (error) {
    console.error('Error fetching agency profile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// PUT - Update agency profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { agencyId, name, email, phone, address } = body;

    const effectiveAgencyId = agencyId || session.agencyId;
    if (!effectiveAgencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== effectiveAgencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const agency = await db.agency.update({
      where: { id: effectiveAgencyId },
      data: {
        name,
        email,
        phone,
        address,
      },
    });

    return NextResponse.json({ success: true, agency });

  } catch (error) {
    console.error('Error updating agency profile:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
