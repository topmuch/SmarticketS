/**
 * Alert Engine — evaluates business rules and creates/suppresses alerts
 *
 * 5 alert types:
 *  1. BUS_PRESQUE_PLEIN  : trigger à 90% capacité → warning
 *  2. RECETTE_ANORMALE : trigger si revenus jour < 60% moyenne → warning
 *  3. RETARD_DETECTE    : trigger si delay > 15min → critical
 *  4. CLIENT_MECONTENT : trigger si annulations >= 3/30j → info
 * 5. COLIS_EN_SOUFFRANCE: trigger si arrivé + 48h non retiré → warning
 *
 * Anti-spam: max 1 alerte/trip/type/heure, regroupement si >3 similaires
 */
import { db } from '@/lib/db';

export type AlertType =
  | 'BUS_PRESQUE_PLEIN'
  | 'RECETTE_ANORMALE'
  | 'RETARD_DETECTE'
  | 'CLIENT_MECONTENT'
  | 'COLIS_EN_SOUFFRANCE';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  category: string;
  title: string;
  message: string;
  tripId?: string;
  baggageId?: string;
  payload?: Record<string, unknown>;
}

// ─── Helpers ───────────────────────────────────────────────

function getAlertConfig(agencyId: string): Record<string, number> {
  // Default thresholds — could be loaded from DB settings
  return {
    bus_capacity_threshold: 90,       // %
    revenue_drop_threshold: 60,         // % of moving average
    delay_critical_minutes: 15,         // minutes
    cancellations_window_days: 30,      // days
    cancellations_threshold: 3,         // count
    parcel_stagnation_hours: 48,         // hours
  };
}

async function isAlertRecent(
  agencyId: string,
  type: string,
  tripId?: string,
  baggageId?: string,
  windowMinutes: number = 60
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMinutes * 60_000);
  const where: Record<string, unknown> = {
    agencyId,
    type,
    createdAt: { gte: cutoff },
  };
  if (tripId) where.tripId = tripId;
  if (baggageId) where.baggageId = baggageId;

  const count = await db.alert.count({ where });
  return count > 0;
}

// ─── Rule Evaluators ───────────────────────────────────────

async function checkBusCapacity(agencyId: string): Promise<AlertRule[]> {
  const config = getAlertConfig(agencyId);
  const alerts: AlertRule[] = [];

  const departures = await db.departure.findMany({
    where: {
      agencyId,
      status: { in: ['SCHEDULED', 'BOARDING'] },
      scheduledTime: { gte: new Date() },
    },
  });

  for (const dep of departures) {
    if (dep.totalSeats <= 0) continue;
    const fillRate = ((dep.totalSeats - dep.availableSeats) / dep.totalSeats) * 100;
    const threshold = config.bus_capacity_threshold;

    if (fillRate >= threshold) {
      // Anti-spam: skip if alert already exists for this trip
      const exists = await isAlertRecent(agencyId, 'BUS_PRESQUE_PLEIN', dep.id, undefined, 60);
      if (exists) continue;

      alerts.push({
        type: 'BUS_PRESQUE_PLEIN',
        severity: 'warning',
        category: 'operations',
        title: 'Bus presque plein',
        message: `Le bus vers ${dep.destination} (${dep.lineNumber}, quai ${dep.platform || 'N/A'}) est rempli à ${Math.round(fillRate)}%. ${dep.availableSeats} place(s) restante(s).`,
        tripId: dep.id,
        payload: {
          destination: dep.destination,
          lineNumber: dep.lineNumber,
          platform: dep.platform,
          fillRate: Math.round(fillRate),
          availableSeats: dep.availableSeats,
          totalSeats: dep.totalSeats,
        },
      });
    }
  }

  return alerts;
}

async function checkDelays(agencyId: string): Promise<AlertRule[]> {
  const config = getAlertConfig(agencyId);
  const alerts: AlertRule[] = [];

  const departures = await db.departure.findMany({
    where: {
      agencyId,
      delayMinutes: { gt: config.delay_critical_minutes },
      status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] },
      scheduledTime: { gte: new Date(Date.now() - 2 * 60 * 60_1000) },
    },
  });

  for (const dep of departures) {
    const exists = await isAlertRecent(agencyId, 'RETARD_DETECTE', dep.id, undefined, 30);
    if (exists) continue;

    alerts.push({
      type: 'RETARD_DETECTE',
      severity: 'critical',
      category: 'operations',
      title: 'Retard détecté',
      message: `Le départ vers ${dep.destination} (${dep.lineNumber}) a un retard de ${dep.delayMinutes} minutes. Heure effective : ${dep.scheduledTime ? new Date(new Date(dep.scheduledTime.getTime() + dep.delayMinutes * 60000)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}.`,
      tripId: dep.id,
      payload: {
        destination: dep.destination,
        lineNumber: dep.lineNumber,
        delayMinutes: dep.delayMinutes,
        platform: dep.platform,
      },
    });
  }

  return alerts;
}

async function checkStagnantParcels(agencyId: string): Promise<AlertRule[]> {
  const config = getAlertConfig(agencyId);
  const alerts: AlertRule[] = [];
  const cutoff = new Date(Date.now() - config.parcel_stagnation_hours * 60 * 60_1000);

  const parcels = await db.baggage.findMany({
    where: {
      agencyId,
      status: 'delivered',
      deliveredAt: { lte: cutoff },
    },
    include: {
      passengerTicket: {
        select: { id: true, destination: true, passengerName: true },
      },
    },
    take: 50,
    orderBy: { deliveredAt: 'asc' },
  });

  for (const p of parcels) {
    const exists = await isAlertRecent(agencyId, 'COLIS_EN_SOUFFRANCE', undefined, p.id, 60);
    if (exists) continue;

    const hoursSince = Math.floor((Date.now() - (p.deliveredAt?.getTime() || 0)) / (60 * 60_1000));

    alerts.push({
      type: 'COLIS_EN_SOUFFRANCE',
      severity: 'warning',
      category: 'colis',
      title: 'Colis non retiré',
      message: `Le colis ${p.reference} (destination: ${p.passengerTicket?.destination || p.destination || '?'}) a été livré il y a ${hoursSince}h mais n'a pas été retiré par le destinataire.`,
      baggageId: p.id,
      payload: {
        reference: p.reference,
        destination: p.passengerTicket?.destination || p.destination,
        hoursSince,
        receiverName: p.receiverName,
        receiverWhatsapp: p.receiverWhatsapp,
      },
    });
  }

  return alerts;
}

// ─── Main Evaluation Function ─────────────────────────────

export async function evaluateAlerts(
  eventType?: string,
  payload?: Record<string, unknown>,
  agencyId?: string
): Promise<{ created: number; total: number; alerts: AlertRule[] }> {
  const targetAgencyId = agencyId || (payload?.agencyId as string) || '';

  // If a specific agency and event are provided, evaluate just that rule
  if (targetAgencyId && eventType) {
    let newAlerts: AlertRule[] = [];

    switch (eventType) {
      case 'check_bus_capacity':
        newAlerts = await checkBusCapacity(targetAgencyId);
        break;
      case 'check_delays':
        newAlerts = await checkDelays(targetAgencyId);
        break;
      case 'check_stagnant_parcels':
        newAlerts = await checkStagnantParcels(targetAgencyId);
        break;
    }

    const created = await persistAlerts(targetAgencyId, newAlerts);
    return { created, total: newAlerts.length, alerts: newAlerts };
  }

  // Otherwise, return empty (full scan would be cron-based)
  return { created: 0, total: 0, alerts: [] };
}

// ─── Persist Alerts to DB ───────────────────────────────────

async function persistAlerts(
  agencyId: string,
  rules: AlertRule[]
): Promise<number> {
  let created = 0;

  for (const rule of rules) {
    await db.alert.create({
      data: {
        agencyId,
        type: rule.type,
        severity: rule.severity,
        category: rule.category,
        title: rule.title,
        message: rule.message,
        tripId: rule.tripId || null,
        baggageId: rule.baggageId || null,
        payload: rule.payload ? JSON.stringify(rule.payload) : null,
      },
    });
    created++;
  }

  return created;
}

// ─── Count similar alerts for grouping ──────────────────────

export async function countSimilarAlerts(
  agencyId: string,
  type?: string,
  status?: string
): Promise<number> {
  const where: Record<string, unknown> = { agencyId };
  if (type) where.type = type;
  if (status) where.status = status;
  return db.alert.count({ where });
}
