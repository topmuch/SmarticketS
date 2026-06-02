import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';

// Validation schema
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['superadmin', 'admin', 'agent', 'agency']),
  agencyId: z.string().optional(),
});

// Update validation schema — stricter than create
const userUpdateSchema = z.object({
  id: z.string().min(1, 'ID utilisateur requis'),
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['superadmin', 'admin', 'agent', 'agency']).optional(),
  agencyId: z.string().nullable().optional(),
});

// Password hashing with bcrypt (compatible with login API)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// GET - List all users
export async function GET() {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const users = await db.user.findMany({
      include: { agency: true },
      orderBy: { createdAt: 'desc' }
    });

    // Remove passwords from response
    const safeUsers = users.map(({ password, ...user }) => user);

    return NextResponse.json({ users: safeUsers });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = userSchema.parse(body);

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validatedData.password);
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name || null,
        password: hashedPassword,
        role: validatedData.role,
        agencyId: validatedData.agencyId || null,
      }
    });

    // Remove password from response
    const { password, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, password, role, ...data } = parsed.data;

    const updateData: Record<string, unknown> = { ...data };
    
    if (password) {
      updateData.password = await hashPassword(password);
    }

    // Only superadmin can change roles
    if (role && currentUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Seul un superadmin peut modifier les rôles' },
        { status: 403 }
      );
    }
    if (role) {
      updateData.role = role;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });

  } catch (error) {
    console.error('Update user error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
