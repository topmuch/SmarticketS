import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isActive } from '@/lib/status';
import { getSession } from '@/lib/session';

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Get all baggages
    const baggages = await db.baggage.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        travelerFirstName: true,
        travelerLastName: true,
      }
    });

    // Get agencies count
    const agenciesCount = await db.agency.count();

    // Calculate statistics
    const totalQR = baggages.length;
    const qrActivatedHajj = baggages.filter(b => b.type === 'hajj' && isActive(b.status)).length;
    const qrActivatedVoyageur = baggages.filter(b => b.type === 'voyageur' && isActive(b.status)).length;

    // Count unique pilgrims (Hajj) - group by name
    const hajjBaggages = baggages.filter(b => b.type === 'hajj' && b.travelerFirstName);
    const uniquePelerins = new Set(
      hajjBaggages.map(b => `${b.travelerFirstName}_${b.travelerLastName}`)
    ).size;

    // Count unique travelers (Voyageur)
    const voyageurBaggages = baggages.filter(b => b.type === 'voyageur' && b.travelerFirstName);
    const uniqueVoyageurs = new Set(
      voyageurBaggages.map(b => `${b.travelerFirstName}_${b.travelerLastName}`)
    ).size;

    // Count expiring soon (within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = baggages.filter(b => 
      b.expiresAt && 
      new Date(b.expiresAt) <= sevenDaysFromNow && 
      new Date(b.expiresAt) > now
    ).length;

    // Get daily activations for the last 7 days
    const last7Days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayActivations = baggages.filter(b => {
        const createdAt = new Date(b.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd && b.type === 'hajj';
      }).length;

      last7Days.push({
        day: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()],
        count: Math.floor(dayActivations / 3), // Divide by 3 to get pilgrim count
      });
    }

    // Get recent activities from scan logs
    const recentScans = await db.scanLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        baggage: {
          select: {
            reference: true,
            type: true,
            travelerFirstName: true,
            travelerLastName: true,
          }
        }
      }
    });

    // Format recent activities
    type ActivityType = {
      id: string;
      type: 'scan' | 'activation';
      name: string;
      reference: string;
      time: string;
      details: string;
      status: 'success';
    };

    const recentActivities: ActivityType[] = recentScans.map((scan) => {
      const timeAgo = getTimeAgo(new Date(scan.createdAt));
      const name = scan.baggage.travelerFirstName 
        ? `${scan.baggage.travelerFirstName} ${scan.baggage.travelerLastName || ''} - ${scan.baggage.type === 'hajj' ? 'Hajj' : 'Voyageur'}`
        : `Scan ${scan.baggage.reference}`;

      return {
        id: scan.id,
        type: 'scan' as const,
        name,
        reference: scan.baggage.reference,
        time: timeAgo,
        details: scan.location || 'Position non partagée',
        status: 'success' as const,
      };
    });

    // If no scans, add some placeholder activities from activations
    if (recentActivities.length === 0) {
      const recentActivations: ActivityType[] = baggages
        .filter(b => isActive(b.status) && b.travelerFirstName)
        .slice(0, 5)
        .map((b, index) => ({
          id: `activation-${index}`,
          type: 'activation' as const,
          name: `${b.travelerFirstName} ${b.travelerLastName || ''} - ${b.type === 'hajj' ? 'Hajj' : 'Voyageur'}`,
          reference: '',
          time: getTimeAgo(new Date(b.createdAt)),
          details: b.type === 'hajj' ? '3 QR activés' : '1 QR activé',
          status: 'success' as const,
        }));

      recentActivities.push(...recentActivations);
    }

    const stats = {
      totalQR,
      qrActivatedHajj,
      qrActivatedVoyageur,
      totalPelerins: uniquePelerins,
      totalVoyageurs: uniqueVoyageurs,
      expiringSoon,
      pendingOrders: 0, // Placeholder for B2B orders feature
      totalAgencies: agenciesCount,
    };

    return NextResponse.json({
      stats,
      dailyActivations: last7Days,
      recentActivities,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return date.toLocaleDateString('fr-FR');
}
