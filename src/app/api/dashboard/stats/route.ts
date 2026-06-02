// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-guard";

// GET /api/dashboard/stats — Role-appropriate KPIs
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (user.role) {
      case "SUPER_ADMIN":
        return handleSuperAdmin(todayStart, monthStart, now);
      case "ADMIN":
        return handleAdmin(user, todayStart, monthStart);
      case "OPERATOR":
        return handleOperator(user, todayStart);
      case "DRIVER":
        return handleDriver(user, todayStart);
      case "CONTROLLER":
        return handleController(user, todayStart);
      default:
        return forbiddenResponse("Rôle non autorisé");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Authorization")) {
      return unauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message.includes("Insufficient")) {
      return forbiddenResponse(error.message);
    }
    const message = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SUPER_ADMIN
// ────────────────────────────────────────────────────────────────────────────

async function handleSuperAdmin(todayStart: Date, monthStart: Date, now: Date) {
  const [
    tenantsAgg,
    usersAgg,
    monthlyTicketsAgg,
    monthlyParcelsAgg,
    todayDeparturesCount,
    recentLogs,
    topRevenueTenants,
  ] = await Promise.all([
    // Tenant counts
    db.tenant.aggregate({
      _count: { id: true },
      where: { isActive: true },
    }),
    db.tenant.aggregate({
      _count: { id: true },
    }),
    // Monthly ticket count
    db.passengerTicket.count({
      where: { activatedAt: { gte: monthStart } },
    }),
    // Monthly parcel count
    db.parcel.count({
      where: { activatedAt: { gte: monthStart } },
    }),
    // Today departures
    db.departure.count({
      where: { date: { gte: todayStart } },
    }),
    // Recent activity (last 8 audit logs)
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    // Top 5 revenue tenants this month
    getTopRevenueTenants(monthStart),
  ]);

  // Monthly revenue from tickets
  const monthlyTicketRevenueResult = await db.passengerTicket.aggregate({
    _sum: { totalPrice: true },
    where: { activatedAt: { gte: monthStart } },
  });

  // Monthly revenue from parcels
  const monthlyParcelRevenueResult = await db.parcel.aggregate({
    _sum: { price: true },
    where: { activatedAt: { gte: monthStart } },
  });

  const monthlyTicketRevenue = monthlyTicketRevenueResult._sum.totalPrice ?? 0;
  const monthlyParcelRevenue = monthlyParcelRevenueResult._sum.price ?? 0;

  // Users by role
  const usersByRole = await db.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });

  const usersByRoleMap: Record<string, number> = {};
  for (const item of usersByRole) {
    usersByRoleMap[item.role] = item._count.id;
  }

  const parsedLogs = recentLogs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return NextResponse.json({
    role: "SUPER_ADMIN",
    data: {
      totalTenants: tenantsAgg._count.id,
      activeTenants: tenantsAgg._count.id,
      totalUsers: usersAgg._count.id,
      usersByRole: usersByRoleMap,
      monthlyTickets: monthlyTicketsAgg,
      monthlyParcels: monthlyParcelsAgg,
      monthlyTicketRevenue,
      monthlyParcelRevenue,
      totalMonthlyRevenue: monthlyTicketRevenue + monthlyParcelRevenue,
      todayDepartures: todayDeparturesCount,
      recentActivity: parsedLogs,
      topRevenueTenants,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// ADMIN
// ────────────────────────────────────────────────────────────────────────────

async function handleAdmin(user: { tenantId: string | null }, todayStart: Date, monthStart: Date) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    return forbiddenResponse("Aucun transporteur associé");
  }

  const [
    todayTicketsActivated,
    todayParcelsActivated,
    todayDeparturesCount,
    parcelsInTransit,
    recentLogs,
    monthlyTicketRevenueResult,
    monthlyParcelRevenueResult,
  ] = await Promise.all([
    db.passengerTicket.count({
      where: { tenantId, activatedAt: { gte: todayStart } },
    }),
    db.parcel.count({
      where: { tenantId, activatedAt: { gte: todayStart } },
    }),
    db.departure.count({
      where: { tenantId, date: { gte: todayStart } },
    }),
    db.parcel.count({
      where: { tenantId, status: "IN_TRANSIT" },
    }),
    db.auditLog.findMany({
      where: { tenantId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    db.passengerTicket.aggregate({
      _sum: { totalPrice: true },
      where: { tenantId, activatedAt: { gte: monthStart } },
    }),
    db.parcel.aggregate({
      _sum: { price: true },
      where: { tenantId, activatedAt: { gte: monthStart } },
    }),
  ]);

  const monthlyTicketRevenue = monthlyTicketRevenueResult._sum.totalPrice ?? 0;
  const monthlyParcelRevenue = monthlyParcelRevenueResult._sum.price ?? 0;

  const parsedLogs = recentLogs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return NextResponse.json({
    role: "ADMIN",
    data: {
      todayTicketsActivated,
      todayParcelsActivated,
      monthlyRevenue: monthlyTicketRevenue + monthlyParcelRevenue,
      monthlyTicketRevenue,
      monthlyParcelRevenue,
      todayDepartures: todayDeparturesCount,
      parcelsInTransit,
      recentActivity: parsedLogs,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// OPERATOR
// ────────────────────────────────────────────────────────────────────────────

async function handleOperator(user: { tenantId: string | null }, todayStart: Date) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    return forbiddenResponse("Aucun transporteur associé");
  }

  const [todayTicketsActivated, todayParcelsActivated, todayDeparturesCount, parcelsInTransit, recentLogs] =
    await Promise.all([
      db.passengerTicket.count({
        where: { tenantId, activatedAt: { gte: todayStart } },
      }),
      db.parcel.count({
        where: { tenantId, activatedAt: { gte: todayStart } },
      }),
      db.departure.count({
        where: { tenantId, date: { gte: todayStart } },
      }),
      db.parcel.count({
        where: { tenantId, status: "IN_TRANSIT" },
      }),
      db.auditLog.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ]);

  const parsedLogs = recentLogs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return NextResponse.json({
    role: "OPERATOR",
    data: {
      todayTicketsActivated,
      todayParcelsActivated,
      parcelsInTransit,
      todayDepartures: todayDeparturesCount,
      recentActivity: parsedLogs,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// DRIVER
// ────────────────────────────────────────────────────────────────────────────

async function handleDriver(user: { id: string; tenantId: string | null }, todayStart: Date) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    return forbiddenResponse("Aucun transporteur associé");
  }

  const [todayDeliveries, pendingDeliveries, recentLogs] = await Promise.all([
    db.parcel.count({
      where: {
        tenantId,
        status: "DELIVERED",
        deliveredById: user.id,
        deliveredAt: { gte: todayStart },
      },
    }),
    db.parcel.count({
      where: { tenantId, status: "IN_TRANSIT" },
    }),
    db.auditLog.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  const parsedLogs = recentLogs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return NextResponse.json({
    role: "DRIVER",
    data: {
      todayDeliveries,
      pendingDeliveries,
      recentActivity: parsedLogs,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ────────────────────────────────────────────────────────────────────────────

async function handleController(user: { tenantId: string | null }, todayStart: Date) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    return forbiddenResponse("Aucun transporteur associé");
  }

  const [todayTicketsUsed, todayDeparturesCount, recentLogs] = await Promise.all([
    db.passengerTicket.count({
      where: { tenantId, status: "used", activatedAt: { gte: todayStart } },
    }),
    db.departure.count({
      where: { tenantId, date: { gte: todayStart } },
    }),
    db.auditLog.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  const parsedLogs = recentLogs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  return NextResponse.json({
    role: "CONTROLLER",
    data: {
      todayTicketsUsed,
      todayDepartures: todayDeparturesCount,
      recentActivity: parsedLogs,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

async function getTopRevenueTenants(monthStart: Date) {
  const tenants = await db.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  const revenueMap: Array<{ tenantId: string; tenantName: string; revenue: number }> = [];

  for (const tenant of tenants) {
    const [ticketRev, parcelRev] = await Promise.all([
      db.passengerTicket.aggregate({
        _sum: { totalPrice: true },
        where: { tenantId: tenant.id, activatedAt: { gte: monthStart } },
      }),
      db.parcel.aggregate({
        _sum: { price: true },
        where: { tenantId: tenant.id, activatedAt: { gte: monthStart } },
      }),
    ]);

    const total = (ticketRev._sum.totalPrice ?? 0) + (parcelRev._sum.price ?? 0);
    revenueMap.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      revenue: total,
    });
  }

  return revenueMap
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
