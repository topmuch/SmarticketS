// @ts-nocheck
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ─── JWT Helper Types (for multi-tenant routes compatibility) ───
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string | null;
  agencyId?: string | null;
  iat?: number;
  exp?: number;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { agency: true }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
          agencyName: user.agency?.name || null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.agencyId = user.agencyId;
        token.agencyName = user.agencyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.agencyId = token.agencyId as string | null;
        session.user.agencyName = token.agencyName as string | null;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 hours
  },
  // Required env var — app will fail to start if missing
  secret: process.env.NEXTAUTH_SECRET!
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// ─── JWT Helpers (for multi-tenant route compatibility) ───
// These are used by remote-imported routes (login-phone, auth-guard, etc.)
//
// FIX: read secrets lazily (at call time, not at module load time)
// so that entrypoint.sh-generated env vars are available in Docker.
function getJwtAccessSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[auth] FATAL: JWT_SECRET not configured');
    }
    throw new Error('JWT_SECRET not configured');
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  return secret;
}

export async function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<{ token: string; expiresIn: number }> {
  const secret = getJwtAccessSecret();
  const expiresIn = 15 * 60; // 15 minutes
  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, expiresIn };
}

export async function generateRefreshToken(payload: { userId: string }): Promise<{ token: string; expiresIn: number }> {
  const secret = getJwtRefreshSecret();
  const expiresIn = 30 * 24 * 60 * 60; // 30 days
  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, expiresIn };
}

export function verifyToken(token: string): JwtPayload {
  const secret = getJwtAccessSecret();
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function refreshAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: number } | null> {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    // Re-generate access token
    const { token, expiresIn } = await generateToken({ userId: payload.userId, email: '', role: 'user' });
    return { token, expiresIn };
  } catch {
    return null;
  }
}
