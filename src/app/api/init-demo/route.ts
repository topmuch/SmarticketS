import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ensureSeeded } from '@/lib/auto-seed';

// Initialize / ensure demo users exist (idempotent - upsert)
export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    // Ensure all demo data (stations, departures, etc.) exists first
    await ensureSeeded();

    const adminPassword = await bcrypt.hash('admin123', 10);
    const agencyPassword = await bcrypt.hash('agence123', 10);

    // Upsert superadmin
    await prisma.user.upsert({
      where: { email: 'admin@smartickets.com' },
      update: { password: adminPassword },
      create: {
        email: 'admin@smartickets.com',
        name: 'Super Admin',
        password: adminPassword,
        role: 'superadmin',
      }
    });

    // Ensure demo agency exists (same as seed data — so demo user sees seeded routes)
    const demoAgency = await prisma.agency.upsert({
      where: { slug: 'ashraf_voyages' },
      update: {},
      create: {
        id: 'demo-agency-1',
        name: 'Ashraf Voyages',
        slug: 'ashraf_voyages',
        email: 'contact@ashraf-voyages.com',
        phone: '+221 77 123 45 67',
        address: 'Dakar, Sénégal',
        active: true,
      }
    });

    // Upsert agency user
    await prisma.user.upsert({
      where: { email: 'agence@smartickets.com' },
      update: { password: agencyPassword },
      create: {
        email: 'agence@smartickets.com',
        name: 'Chef Agence',
        password: agencyPassword,
        role: 'agency',
        agencyId: demoAgency.id,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Users ready',
      users: [
        { email: 'admin@smartickets.com', role: 'superadmin' },
        { email: 'agence@smartickets.com', role: 'agency' }
      ]
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
