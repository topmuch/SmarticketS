import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server, Socket } from 'socket.io';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PORT = 3004;
const ALL_ROOM = '__ALL__';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(): string {
  return new Date().toISOString();
}

function resolveStationRoom(stationSlug?: string): string | string[] {
  if (!stationSlug || stationSlug === '__ALL__' || stationSlug === '*') {
    // Broadcast to every room except the internal Socket.IO ones
    return [...io.sockets.adapter.rooms.keys()].filter((r) => !r.startsWith('/'));
  }
  return `station:${stationSlug}`;
}

function broadcastTo(socket: Socket, room: string | string[], event: string, data: unknown) {
  if (Array.isArray(room)) {
    for (const r of room) {
      socket.to(r).emit(event, data);
    }
    console.log(`[KioskService] 📡 ${ts()} | ${event} → ALL (${room.length} rooms)`);
  } else {
    socket.to(room).emit(event, data);
    console.log(`[KioskService] 📡 ${ts()} | ${event} → ${room}`);
  }
}

// ---------------------------------------------------------------------------
// REST Push Endpoint Handler
// ---------------------------------------------------------------------------
function jsonRes(res: ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function handleRestPush(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'api' || pathParts[1] !== 'push' || !pathParts[2]) {
    jsonRes(res, 404, { error: 'Not found. Use POST /api/push/:slug' });
    return;
  }

  if (req.method !== 'POST') {
    jsonRes(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  const slug = pathParts[2];
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const { event, data, broadcast } = body;
      if (!event || typeof event !== 'string') {
        jsonRes(res, 400, { error: 'Missing "event" field' });
        return;
      }

      const payload = { ...data, timestamp: Date.now() };
      if (broadcast) {
        io.emit(event, payload);
      } else {
        io.to(`station:${slug}`).emit(event, payload);
      }

      console.log(`[KioskService] 🔔 ${ts()} | REST PUSH → slug=${slug} | event=${event}`);
      jsonRes(res, 200, { success: true, event, slug, timestamp: Date.now() });
    } catch {
      jsonRes(res, 400, { error: 'Invalid JSON body' });
    }
  });
}

// ---------------------------------------------------------------------------
// Socket.IO Server
// ---------------------------------------------------------------------------
const httpServer = createServer((req, res) => {
  // Handle REST push requests on the same HTTP server
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  if (req.method === 'POST' && url.pathname.startsWith('/api/push/')) {
    handleRestPush(req, res);
  } else {
    // Default response for non-socket requests
    jsonRes(res, 404, { error: 'Not found' });
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  // Allow connections through the Caddy gateway
  allowRequest: (_req, callback) => {
    callback(null, true);
  },
});

// ---------------------------------------------------------------------------
// Connection handler with role-based rooms
// ---------------------------------------------------------------------------
interface ClientInfo {
  id: string;
  role: 'kiosk' | 'admin' | 'unknown';
  slug?: string;
  joinedRooms: Set<string>;
}

const connectedClients = new Map<string, ClientInfo>();

io.on('connection', (socket: Socket) => {
  console.log(`[KioskService] ✅ ${ts()} | Client connected: ${socket.id}`);

  const clientInfo: ClientInfo = {
    id: socket.id,
    role: 'unknown',
    joinedRooms: new Set<string>(),
  };
  connectedClients.set(socket.id, clientInfo);

  // ----- join:station (with role) -------------------------------------------
  socket.on('join:station', (payload: { slug: string; role?: string }) => {
    const slug = payload?.slug;
    const role = payload?.role || 'kiosk';

    if (!slug || typeof slug !== 'string') {
      console.warn(`[KioskService] ⚠️  ${ts()} | join:station called with invalid slug from ${socket.id}`);
      return;
    }

    const room = `station:${slug}`;
    socket.join(room);
    clientInfo.slug = slug;
    clientInfo.role = role as 'kiosk' | 'admin';
    clientInfo.joinedRooms.add(room);

    console.log(`[KioskService] 🚪 ${ts()} | ${socket.id} joined ${room} as ${role}`);
  });

  // ----- kiosk:delay --------------------------------------------------------
  socket.on(
    'kiosk:delay',
    (payload: {
      departureId: string;
      minutes: number;
      destination: string;
      stationSlug?: string;
      timestamp?: number;
    }) => {
      const data = {
        departureId: payload.departureId,
        minutes: payload.minutes,
        destination: payload.destination,
        timestamp: payload.timestamp ?? Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:delay', data);
    },
  );

  // ----- kiosk:departed -----------------------------------------------------
  socket.on(
    'kiosk:departed',
    (payload: {
      departureId: string;
      destination: string;
      stationSlug?: string;
      timestamp?: number;
    }) => {
      const data = {
        departureId: payload.departureId,
        destination: payload.destination,
        timestamp: payload.timestamp ?? Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:departed', data);
    },
  );

  // ----- kiosk:cancelled ----------------------------------------------------
  socket.on(
    'kiosk:cancelled',
    (payload: {
      departureId: string;
      destination: string;
      stationSlug?: string;
      timestamp?: number;
    }) => {
      const data = {
        departureId: payload.departureId,
        destination: payload.destination,
        timestamp: payload.timestamp ?? Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:cancelled', data);
    },
  );

  // ----- kiosk:boarding -----------------------------------------------------
  socket.on(
    'kiosk:boarding',
    (payload: {
      departureId: string;
      destination: string;
      scheduledTime: string;
      platform: string;
      stationSlug?: string;
      timestamp?: number;
    }) => {
      const data = {
        departureId: payload.departureId,
        destination: payload.destination,
        scheduledTime: payload.scheduledTime,
        platform: payload.platform,
        timestamp: payload.timestamp ?? Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:boarding', data);
    },
  );

  // ----- kiosk:imminent -----------------------------------------------------
  socket.on(
    'kiosk:imminent',
    (payload: {
      departureId: string;
      destination: string;
      stationSlug?: string;
      timestamp?: number;
    }) => {
      const data = {
        departureId: payload.departureId,
        destination: payload.destination,
        timestamp: payload.timestamp ?? Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:imminent', data);
    },
  );

  // ----- kiosk:config -------------------------------------------------------
  socket.on(
    'kiosk:config',
    (payload: {
      volume?: number;
      muted?: boolean;
      generalMessage?: string;
      generalMessageInterval?: number;
      stationSlug?: string;
    }) => {
      const data: Record<string, unknown> = { timestamp: Date.now() };
      if (payload.volume !== undefined) data.volume = payload.volume;
      if (payload.muted !== undefined) data.muted = payload.muted;
      if (payload.generalMessage !== undefined) data.generalMessage = payload.generalMessage;
      if (payload.generalMessageInterval !== undefined)
        data.generalMessageInterval = payload.generalMessageInterval;
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:config', data);
    },
  );

  // ----- kiosk:broadcast (generic) ------------------------------------------
  socket.on(
    'kiosk:broadcast',
    (payload: { stationSlug?: string; event: string; data: unknown }) => {
      const room = resolveStationRoom(payload.stationSlug);
      broadcastTo(socket, room, payload.event, payload.data);
    },
  );

  // ----- kiosk:generalMessage ----------------------------------------------
  socket.on(
    'kiosk:generalMessage',
    (payload: {
      text: string;
      priority: number;
      stationSlug?: string;
    }) => {
      const data = {
        text: payload.text,
        priority: payload.priority,
        timestamp: Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:generalMessage', data);
    },
  );

  // ----- kiosk:manualAnnounce (new: P1/P2 from admin) ----------------------
  socket.on(
    'kiosk:manualAnnounce',
    (payload: {
      text: string;
      priority: number;
      stationSlug?: string;
      type?: 'CLIENT_CALL' | 'DRIVER_CALL' | 'SECURITY' | 'GENERAL';
      metadata?: Record<string, unknown>;
    }) => {
      const data = {
        text: payload.text,
        priority: payload.priority,
        type: payload.type || 'GENERAL',
        metadata: payload.metadata || {},
        timestamp: Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:manualAnnounce', data);
    },
  );

  // ----- kiosk:updateTrip (new: generic trip update from admin) -------------
  socket.on(
    'kiosk:updateTrip',
    (payload: {
      departureId: string;
      status: string;
      destination: string;
      stationSlug?: string;
      [key: string]: unknown;
    }) => {
      const data = {
        departureId: payload.departureId,
        status: payload.status,
        destination: payload.destination,
        timestamp: Date.now(),
      };
      broadcastTo(socket, resolveStationRoom(payload.stationSlug), 'kiosk:updateTrip', data);
    },
  );

  // ----- disconnect ---------------------------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(
      `[KioskService] ❌ ${ts()} | Client disconnected: ${socket.id} | reason: ${reason} | rooms: [${[...clientInfo.joinedRooms].join(', ')}]`,
    );
    connectedClients.delete(socket.id);
  });

  // ----- error handling -----------------------------------------------------
  socket.on('error', (err) => {
    console.error(`[KioskService] 🔥 ${ts()} | Socket error on ${socket.id}:`, err.message);
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`\n[KioskService] 🟢 ${ts()} | Kiosk WebSocket service running on port ${PORT}`);
  console.log(`[KioskService] 🟢 ${ts()} | Transports: websocket, polling`);
  console.log(`[KioskService] 🟢 ${ts()} | REST endpoint: POST /api/push/:slug`);
  console.log(`[KioskService] 🟢 ${ts()} | CORS: all origins (gateway proxy mode)\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`\n[KioskService] 🛑 ${ts()} | SIGTERM received — shutting down…`);
  io.close();
  httpServer.close(() => {
    console.log(`[KioskService] 🛑 ${ts()} | HTTP server closed. Goodbye.`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`\n[KioskService] 🛑 ${ts()} | SIGINT received — shutting down…`);
  io.close();
  httpServer.close(() => {
    console.log(`[KioskService] 🛑 ${ts()} | HTTP server closed. Goodbye.`);
    process.exit(0);
  });
});
