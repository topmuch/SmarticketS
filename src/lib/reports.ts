// @ts-nocheck
/**
 * SmartTicketQR — Report Aggregation Helpers
 * Optimized DB queries for tenant and platform reports
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ─── Types ───

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  lineId?: string;
  stationId?: string;
  status?: string;
}

// ─── Date helpers ───

export function parseDateRange(filters: ReportFilters): DateRange {
  const now = new Date();
  const endDate = filters.endDate
    ? new Date(filters.endDate + "T23:59:59.999Z")
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startDate = filters.startDate
    ? new Date(filters.startDate + "T00:00:00.000Z")
    : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  return { startDate, endDate };
}

// ─── Tenant Reports ───

export interface TenantReportData {
  period: { start: string; end: string };
  tickets: {
    total: number;
    active: number;
    used: number;
    cancelled: number;
    revenue: number;
    childTickets: number;
  };
  parcels: {
    total: number;
    inTransit: number;
    delivered: number;
    confirmed: number;
    cancelled: number;
    revenue: number;
  };
  departures: {
    total: number;
    scheduled: number;
    departed: number;
    delayed: number;
    cancelled: number;
  };
  dailyStats: Array<{
    date: string;
    tickets: number;
    parcels: number;
    revenue: number;
  }>;
  topLines: Array<{
    lineId: string;
    lineName: string;
    tickets: number;
    revenue: number;
  }>;
  topStations: Array<{
    stationId: string;
    stationName: string;
    departures: number;
  }>;
}

export async function generateTenantReport(
  tenantId: string,
  filters: ReportFilters
): Promise<TenantReportData> {
  const { startDate, endDate } = parseDateRange(filters);

  const ticketWhere: Prisma.PassengerTicketWhereInput = {
    tenantId,
    activatedAt: { gte: startDate, lte: endDate },
    ...(filters.lineId ? { lineId: filters.lineId } : {}),
    ...(filters.stationId
      ? { departure: { stationId: filters.stationId } }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const parcelWhere: Prisma.ParcelWhereInput = {
    tenantId,
    activatedAt: { gte: startDate, lte: endDate },
    ...(filters.status ? { status: filters.status as never } : {}),
  };

  const departureWhere: Prisma.DepartureWhereInput = {
    tenantId,
    scheduledTime: { gte: startDate, lte: endDate },
    ...(filters.stationId ? { stationId: filters.stationId } : {}),
  };

  // Run all queries in parallel
  const [
    ticketStats,
    parcelStats,
    departureStats,
    dailyTicketData,
    dailyParcelData,
    topLines,
    topStations,
  ] = await Promise.all([
    // Ticket aggregation
    db.passengerTicket.groupBy({
      by: ["status"],
      where: ticketWhere,
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    // Parcel aggregation
    db.parcel.groupBy({
      by: ["status"],
      where: parcelWhere,
      _count: { id: true },
      _sum: { price: true },
    }),
    // Departure aggregation
    db.departure.groupBy({
      by: ["status"],
      where: departureWhere,
      _count: { id: true },
    }),
    // Daily ticket stats
    db.$queryRawUnsafe<
      Array<{ date: string; count: number; revenue: number }>
    >(
      `SELECT DATE(activatedAt) as date, COUNT(*) as count, SUM(totalPrice) as revenue
       FROM PassengerTicket
       WHERE tenantId = ? AND activatedAt >= ? AND activatedAt <= ?
       GROUP BY DATE(activatedAt)
       ORDER BY date`,
      tenantId,
      startDate.toISOString(),
      endDate.toISOString()
    ),
    // Daily parcel stats
    db.$queryRawUnsafe<Array<{ date: string; count: number }>>(
      `SELECT DATE(activatedAt) as date, COUNT(*) as count
       FROM Parcel
       WHERE tenantId = ? AND activatedAt >= ? AND activatedAt <= ?
       GROUP BY DATE(activatedAt)
       ORDER BY date`,
      tenantId,
      startDate.toISOString(),
      endDate.toISOString()
    ),
    // Top lines
    db.passengerTicket.groupBy({
      by: ["lineId"],
      where: ticketWhere,
      _count: { id: true },
      _sum: { totalPrice: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    // Top stations
    db.departure.groupBy({
      by: ["stationId"],
      where: departureWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  // Resolve line and station names
  const lineIds = topLines.map((l) => l.lineId).filter(Boolean);
  const stationIds = topStations.map((s) => s.stationId);

  const [lines, stations] = await Promise.all([
    lineIds.length > 0
      ? db.line.findMany({
          where: { id: { in: lineIds } },
          select: { id: true, name: true },
        })
      : [],
    stationIds.length > 0
      ? db.station.findMany({
          where: { id: { in: stationIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const lineMap = new Map(lines.map((l) => [l.id, l.name]));
  const stationMap = new Map(stations.map((s) => [s.id, s.name]));

  // Merge daily stats
  const dailyMap = new Map<string, { tickets: number; parcels: number; revenue: number }>();
  for (const d of dailyTicketData) {
    dailyMap.set(d.date, {
      tickets: d.count,
      parcels: 0,
      revenue: d.revenue || 0,
    });
  }
  for (const d of dailyParcelData) {
    const existing = dailyMap.get(d.date) || { tickets: 0, parcels: 0, revenue: 0 };
    existing.parcels = d.count;
    dailyMap.set(d.date, existing);
  }
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Build ticket stats
  const tickets = {
    total: 0,
    active: 0,
    used: 0,
    cancelled: 0,
    rescheduled: 0,
    revenue: 0,
    childTickets: 0,
  };
  for (const s of ticketStats) {
    const count = s._count.id;
    const rev = s._sum.totalPrice || 0;
    tickets.total += count;
    tickets.revenue += rev;
    if (s.status === "active") tickets.active += count;
    if (s.status === "used") tickets.used += count;
    if (s.status === "cancelled") tickets.cancelled += count;
    if (s.status === "rescheduled") tickets.rescheduled += count;
  }

  // Build parcel stats
  const parcels = {
    total: 0,
    inTransit: 0,
    delivered: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
  };
  for (const s of parcelStats) {
    const count = s._count.id;
    const rev = s._sum.price || 0;
    parcels.total += count;
    parcels.revenue += rev;
    if (s.status === "IN_TRANSIT") parcels.inTransit += count;
    if (s.status === "DELIVERED") parcels.delivered += count;
    if (s.status === "CONFIRMED") parcels.confirmed += count;
    if (s.status === "CANCELLED") parcels.cancelled += count;
  }

  // Build departure stats
  const departures = {
    total: 0,
    scheduled: 0,
    departed: 0,
    delayed: 0,
    cancelled: 0,
    boarding: 0,
  };
  for (const s of departureStats) {
    const count = s._count.id;
    departures.total += count;
    if (s.status === "SCHEDULED") departures.scheduled += count;
    if (s.status === "DEPARTED") departures.departed += count;
    if (s.status === "DELAYED") departures.delayed += count;
    if (s.status === "CANCELLED") departures.cancelled += count;
    if (s.status === "BOARDING") departures.boarding += count;
  }

  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    tickets,
    parcels,
    departures,
    dailyStats,
    topLines: topLines
      .filter((l) => l.lineId)
      .map((l) => ({
        lineId: l.lineId,
        lineName: lineMap.get(l.lineId) || "Inconnue",
        tickets: l._count.id,
        revenue: l._sum.totalPrice || 0,
      })),
    topStations: topStations.map((s) => ({
      stationId: s.stationId,
      stationName: stationMap.get(s.stationId) || "Inconnue",
      departures: s._count.id,
    })),
  };
}

// ─── Platform Reports (Superadmin) ───

export interface PlatformReportData {
  tenants: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  revenue: {
    total: number;
    byTenant: Array<{ tenantId: string; tenantName: string; revenue: number }>;
    byMonth: Array<{ month: string; revenue: number }>;
  };
  topTenants: Array<{
    tenantId: string;
    tenantName: string;
    tickets: number;
    parcels: number;
    revenue: number;
  }>;
}

export async function generatePlatformReport(
  filters: ReportFilters
): Promise<PlatformReportData> {
  const { startDate, endDate } = parseDateRange(filters);

  const [
    tenantCount,
    activeTenantCount,
    userStats,
    ticketRevenue,
    parcelRevenue,
    monthlyRevenue,
    tenantMetrics,
  ] = await Promise.all([
    db.tenant.count(),
    db.tenant.count({ where: { isActive: true } }),
    db.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),
    db.passengerTicket.aggregate({
      where: { activatedAt: { gte: startDate, lte: endDate } },
      _sum: { totalPrice: true },
      _count: { id: true },
    }),
    db.parcel.aggregate({
      where: { activatedAt: { gte: startDate, lte: endDate } },
      _sum: { price: true },
      _count: { id: true },
    }),
    db.$queryRawUnsafe<Array<{ month: string; revenue: number }>>(
      `SELECT strftime('%Y-%m', activatedAt) as month, SUM(totalPrice) as revenue
       FROM PassengerTicket
       WHERE activatedAt >= ? AND activatedAt <= ?
       GROUP BY strftime('%Y-%m', activatedAt)
       ORDER BY month DESC
       LIMIT 12`,
      startDate.toISOString(),
      endDate.toISOString()
    ),
    // Per-tenant metrics
    db.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        passengerTickets: {
          where: { activatedAt: { gte: startDate, lte: endDate } },
          select: { totalPrice: true },
        },
        parcels: {
          where: { activatedAt: { gte: startDate, lte: endDate } },
          select: { price: true },
        },
      },
    }),
  ]);

  const byRole: Record<string, number> = {};
  for (const s of userStats) {
    byRole[s.role] = s._count.id;
  }

  const ticketRev = ticketRevenue._sum.totalPrice || 0;
  const parcelRev = parcelRevenue._sum.price || 0;
  const totalRevenue = ticketRev + parcelRev;

  const byTenant = tenantMetrics
    .map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      revenue:
        t.passengerTickets.reduce((s, t) => s + t.totalPrice, 0) +
        t.parcels.reduce((s, p) => s + p.price, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topTenants = byTenant
    .slice(0, 10)
    .map((t, i) => ({
      ...t,
      tickets: tenantMetrics[i]?.passengerTickets.length || 0,
      parcels: tenantMetrics[i]?.parcels.length || 0,
    }));

  return {
    tenants: {
      total: tenantCount,
      active: activeTenantCount,
      inactive: tenantCount - activeTenantCount,
    },
    users: {
      total: Object.values(byRole).reduce((a, b) => a + b, 0),
      byRole,
    },
    revenue: {
      total: totalRevenue,
      byTenant,
      byMonth: monthlyRevenue,
    },
    topTenants,
  };
}

// ─── CSV Export ───

export function generateCSV(
  headers: string[],
  rows: string[][]
): string {
  const csvHeader = headers.join(",");
  const csvRows = rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  return [csvHeader, ...csvRows].join("\n");
}

export function exportTenantReportCSV(report: TenantReportData): string {
  const headers = [
    "Date",
    "Tickets",
    "Colis",
    "Revenus (FCFA)",
  ];
  const rows = report.dailyStats.map((d) => [
    d.date,
    String(d.tickets),
    String(d.parcels),
    String(d.revenue),
  ]);
  return generateCSV(headers, rows);
}

export function exportPlatformReportCSV(report: PlatformReportData): string {
  const headers = [
    "Transporteur",
    "Revenus (FCFA)",
  ];
  const rows = report.revenue.byTenant.map((t) => [
    t.tenantName,
    String(t.revenue),
  ]);
  return generateCSV(headers, rows);
}
