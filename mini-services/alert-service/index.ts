// @ts-nocheck
/**
 * SmarticketS Alert Engine — WebSocket + Cron mini-service
 *
 * Port 3003: Socket.io server + HTTP API
 * - Socket.io events: alert:new, alert:resolved, alert:updated, agency:connect
 * - Agency-scoped rooms: agency:{agencyId}
 * - HTTP endpoints: GET /api/internal/health, POST /api/internal/evaluate
 * - Cron: every 60s evaluates all 3 rule types for all active agencies
 */

import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';

// ─── Prisma Client ──────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// ─── Types ───────────────────────────────────────────────────

type AlertType = 'BUS_PRESQUE_PLEIN' | 'RETARD_DETECTE' | 'COLIS_EN_SOUFFRANCE';
type AlertSeverity = 'critical' | 'warning' | 'info';

interface AlertRule {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  category: string;
  title: string;
  message: string;
  agencyId: string;
  tripId?: string;
  baggageId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

// ─── Zod Schemas ────────────────────────────────────────────

const evaluateRequestSchema = z.object({
  eventType: z.string().min(1, 'eventType requis'),
  agencyId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

const agencyConnectSchema = z.object({
  agencyId: z.string().min(1, 'agencyId requis'),
});

// ─── Helpers ────────────────────────────────────────────────

function getAlertConfig(_agencyId: string): Record<string, number> {
  return {
    bus_capacity_threshold: 90,
    revenue_drop_threshold: 60,
    delay_critical_minutes: 15,
    cancellations_window_days: 30,
    cancellations_threshold: 3,
    parcel_stagnation_hours: 48,
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

// ─── Rule Evaluators ────────────────────────────────────────

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
      const exists = await isAlertRecent(agencyId, 'BUS_PRESQUE_PLEIN', dep.id, undefined, 60);
      if (exists) continue;

      const created = await db.alert.create({
        data: {
          agencyId,
          type: 'BUS_PRESQUE_PLEIN',
          severity: 'warning',
          category: 'operations',
          title: 'Bus presque plein',
          message: `Le bus vers ${dep.destination} (${dep.lineNumber}, quai ${dep.platform || 'N/A'}) est rempli à ${Math.round(fillRate)}%. ${dep.availableSeats} place(s) restante(s).`,
          tripId: dep.id,
          payload: JSON.stringify({
            destination: dep.destination,
            lineNumber: dep.lineNumber,
            platform: dep.platform,
            fillRate: Math.round(fillRate),
            availableSeats: dep.availableSeats,
            totalSeats: dep.totalSeats,
          }),
        },
      });

      alerts.push({
        id: created.id,
        type: 'BUS_PRESQUE_PLEIN',
        severity: 'warning',
        category: 'operations',
        title: created.title,
        message: created.message,
        agencyId,
        tripId: dep.id,
        payload: {
          destination: dep.destination,
          lineNumber: dep.lineNumber,
          platform: dep.platform,
          fillRate: Math.round(fillRate),
          availableSeats: dep.availableSeats,
          totalSeats: dep.totalSeats,
        },
        createdAt: created.createdAt.toISOString(),
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

    const estimatedTime = dep.scheduledTime
      ? new Date(dep.scheduledTime.getTime() + dep.delayMinutes * 60000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    const created = await db.alert.create({
      data: {
        agencyId,
        type: 'RETARD_DETECTE',
        severity: 'critical',
        category: 'operations',
        title: 'Retard détecté',
        message: `Le départ vers ${dep.destination} (${dep.lineNumber}) a un retard de ${dep.delayMinutes} minutes. Heure effective : ${estimatedTime}.`,
        tripId: dep.id,
        payload: JSON.stringify({
          destination: dep.destination,
          lineNumber: dep.lineNumber,
          delayMinutes: dep.delayMinutes,
          platform: dep.platform,
        }),
      },
    });

    alerts.push({
      id: created.id,
      type: 'RETARD_DETECTE',
      severity: 'critical',
      category: 'operations',
      title: created.title,
      message: created.message,
      agencyId,
      tripId: dep.id,
      payload: {
        destination: dep.destination,
        lineNumber: dep.lineNumber,
        delayMinutes: dep.delayMinutes,
        platform: dep.platform,
      },
      createdAt: created.createdAt.toISOString(),
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

    const created = await db.alert.create({
      data: {
        agencyId,
        type: 'COLIS_EN_SOUFFRANCE',
        severity: 'warning',
        category: 'colis',
        title: 'Colis non retiré',
        message: `Le colis ${p.reference} (destination: ${p.passengerTicket?.destination || p.destination || '?'}) a été livré il y a ${hoursSince}h mais n'a pas été retiré par le destinataire.`,
        baggageId: p.id,
        payload: JSON.stringify({
          reference: p.reference,
          destination: p.passengerTicket?.destination || p.destination,
          hoursSince,
          receiverName: p.receiverName,
          receiverWhatsapp: p.receiverWhatsapp,
        }),
      },
    });

    alerts.push({
      id: created.id,
      type: 'COLIS_EN_SOUFFRANCE',
      severity: 'warning',
      category: 'colis',
      title: created.title,
      message: created.message,
      agencyId,
      baggageId: p.id,
      payload: {
        reference: p.reference,
        destination: p.passengerTicket?.destination || p.destination,
        hoursSince,
        receiverName: p.receiverName,
        receiverWhatsapp: p.receiverWhatsapp,
      },
      createdAt: created.createdAt.toISOString(),
    });
  }

  return alerts;
}

// ─── Evaluate All Rules for an Agency ───────────────────────

async function evaluateAllRulesForAgency(agencyId: string): Promise<{
  evaluated: number;
  created: number;
  alerts: AlertRule[];
}> {
  const [busAlerts, delayAlerts, parcelAlerts] = await Promise.all([
    checkBusCapacity(agencyId),
    checkDelays(agencyId),
    checkStagnantParcels(agencyId),
  ]);

  const allAlerts = [...busAlerts, ...delayAlerts, ...parcelAlerts];
  return { evaluated: 3, created: allAlerts.length, alerts: allAlerts };
}

// ─── HTTP Server + Socket.io ─────────────────────────────────

const PORT = 3003;
const startTime = Date.now();
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'smartickets-internal-secret';

const httpServer = createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/api/internal/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        port: PORT,
        service: 'alert-engine',
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Evaluate endpoint
  if (req.method === 'POST' && req.url === '/api/internal/evaluate') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // API key authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const parsed = JSON.parse(body);
        const validation = evaluateRequestSchema.safeParse(parsed);

        if (!validation.success) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Données invalides', details: validation.error.flatten().fieldErrors }));
          return;
        }

        const { eventType, agencyId, payload } = validation.data;

        if (!agencyId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'agencyId requis pour le mode interne' }));
          return;
        }

        let newAlerts: AlertRule[] = [];
        let evaluated = 0;

        if (eventType === 'check_all') {
          // Full evaluation for one agency
          const result = await evaluateAllRulesForAgency(agencyId);
          newAlerts = result.alerts;
          evaluated = result.evaluated;
        } else {
          // Single rule evaluation
          evaluated = 1;
          switch (eventType) {
            case 'check_bus_capacity':
              newAlerts = await checkBusCapacity(agencyId);
              break;
            case 'check_delays':
              newAlerts = await checkDelays(agencyId);
              break;
            case 'check_stagnant_parcels':
              newAlerts = await checkStagnantParcels(agencyId);
              break;
            default:
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `eventType inconnu: ${eventType}` }));
              return;
          }
        }

        // Broadcast new alerts via Socket.io to the agency room
        for (const alert of newAlerts) {
          io.to(`agency:${alert.agencyId}`).emit('alert:new', alert);
        }

        console.log(
          `[AlertEngine/Internal] agency=${agencyId} evaluated=${evaluated} created=${newAlerts.length}`
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            agencyId,
            evaluated,
            created: newAlerts.length,
            alerts: newAlerts,
          })
        );
      } catch (error) {
        console.error('[AlertEngine/Internal] evaluate error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur' }));
      }
    });
    return;
  }

  // 404 for all other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── Socket.io Setup ────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] client connected: ${socket.id}`);

  // Handle agency connection — client joins an agency-scoped room
  socket.on('agency:connect', (data: unknown) => {
    const validation = agencyConnectSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('error', { message: 'agencyId requis' });
      return;
    }

    const { agencyId } = validation.data;
    const room = `agency:${agencyId}`;
    socket.join(room);
    console.log(`[Socket.io] ${socket.id} joined room ${room}`);

    // Confirm connection
    socket.emit('agency:connected', {
      agencyId,
      message: 'Connecté au flux d\'alertes en temps réel',
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Cron Scheduler ──────────────────────────────────────────

const CRON_INTERVAL_MS = 60_000; // 60 seconds

async function cronEvaluateAllAgencies() {
  try {
    const agencies = await db.agency.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    if (agencies.length === 0) {
      console.log('[AlertEngine/Cron] No active agencies found');
      return;
    }

    for (const agency of agencies) {
      try {
        const result = await evaluateAllRulesForAgency(agency.id);

        // Broadcast new alerts via Socket.io
        for (const alert of result.alerts) {
          io.to(`agency:${alert.agencyId}`).emit('alert:new', alert);
        }

        console.log(
          `[AlertEngine/Cron] agency=${agency.id} evaluated=${result.evaluated} created=${result.created}`
        );
      } catch (agencyError) {
        console.error(`[AlertEngine/Cron] Error for agency ${agency.id}:`, agencyError);
      }
    }
  } catch (error) {
    console.error('[AlertEngine/Cron] Fatal error:', error);
  }
}

// Start the cron scheduler
console.log(`[AlertEngine/Cron] Scheduler started (interval: ${CRON_INTERVAL_MS / 1000}s)`);
setInterval(cronEvaluateAllAgencies, CRON_INTERVAL_MS);

// Run once on startup (delayed 3s to allow DB connection to warm up)
setTimeout(() => {
  console.log('[AlertEngine/Cron] Running initial evaluation...');
  cronEvaluateAllAgencies();
}, 3000);

// ─── Start Server ────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[AlertEngine] WebSocket + HTTP server running on port ${PORT}`);
  console.log(`[AlertEngine] Health: http://localhost:${PORT}/api/internal/health`);
  console.log(`[AlertEngine] Evaluate: POST http://localhost:${PORT}/api/internal/evaluate`);
  console.log(`[AlertEngine] Socket.io: ws://localhost:${PORT}`);
});
