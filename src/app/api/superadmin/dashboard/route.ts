import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";

// GET /api/superadmin/dashboard — Platform-wide stats
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN");

    const [
      tenantCountResult,
      activeTenantCount,
      userStats,
      ticketStats,
      parcelStats,
      departureStats,
      notificationStats,
      recentActivity,
      topRevenueTenants,
    ] = await Promise.all([
      // Tenant total count
      db.tenant.count(),

      // Active tenants
      db.tenant.count({ where: { isActive: true } }),

      // User stats by role
      db.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),

      // Ticket stats (current month)
      db.passengerTicket.aggregate({
        where: {
          activatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _count: { id: true },
        _sum: { totalPrice: true },
      }),

      // Parcel stats (current month)
      db.parcel.aggregate({
        where: {
          activatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _count: { id: true },
        _sum: { price: true },
      }),

      // Departure stats (today)
      db.departure.count({
        where: {
          scheduledTime: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              new Date().getDate()
            ),
          },
        },
      }),

      // Notification stats
      db.notification.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Recent audit logs
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          tenant: {
            select: { name: true },
          },
        },
      }),

      // Top revenue tenants (current month)
      db.$queryRawUnsafe<
        Array<{
          tenantId: string;
          tenantName: string;
          ticketRevenue: number;
          parcelRevenue: number;
        }>
      >(
        `SELECT
          t.id as tenantId, t.name as tenantName,
          COALESCE(SUM(pt.totalPrice), 0) as ticketRevenue,
          COALESCE(SUM(p.price), 0) as parcelRevenue
         FROM Tenant t
         LEFT JOIN PassengerTicket pt ON pt.tenantId = t.id
           AND pt.activatedAt >= datetime('now', 'start of month')
         LEFT JOIN Parcel p ON p.tenantId = t.id
           AND p.activatedAt >= datetime('now', 'start of month')
         WHERE t.isActive = 1
         GROUP BY t.id
         ORDER BY (COALESCE(SUM(pt.totalPrice), 0) + COALESCE(SUM(p.price), 0)) DESC
         LIMIT 5`
      ),
    ]);

    // Build user by role map
    const usersByRole: Record<string, number> = {};
    for (const s of userStats) {
      usersByRole[s.role] = s._count.id;
    }
    const totalUsers = Object.values(usersByRole).reduce((a, b) => a + b, 0);

    // Build notification status map
    const notificationsByStatus: Record<string, number> = {};
    for (const s of notificationStats) {
      notificationsByStatus[s.status] = s._count.id;
    }

    const totalMonthlyRevenue =
      (ticketStats._sum.totalPrice || 0) + (parcelStats._sum.price || 0);

    return NextResponse.json({
      summary: {
        totalTenants: tenantCountResult,
        activeTenants: activeTenantCount,
        totalUsers,
        usersByRole,
        monthlyTickets: ticketStats._count.id,
        monthlyTicketRevenue: ticketStats._sum.totalPrice || 0,
        monthlyParcels: parcelStats._count.id,
        monthlyParcelRevenue: parcelStats._sum.price || 0,
        totalMonthlyRevenue,
        todayDepartures: departureStats,
        notificationsByStatus,
      },
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        createdAt: log.createdAt,
        user: log.user,
        tenant: log.tenant,
      })),
      topRevenueTenants: topRevenueTenants.map((t) => ({
        ...t,
        totalRevenue: t.ticketRevenue + t.parcelRevenue,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
