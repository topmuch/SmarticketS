import { createServer } from 'http';
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
    // Target every known station room individually
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
// Socket.IO Server
// ---------------------------------------------------------------------------
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
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
// Connection handler
// ---------------------------------------------------------------------------
io.on('connection', (socket: Socket) => {
  console.log(`[KioskService] ✅ ${ts()} | Client connected: ${socket.id}`);

  // Track which rooms this socket has joined (for logging)
  const joinedRooms = new Set<string>();

  // ----- join:station -------------------------------------------------------
  socket.on('join:station', (slug: string) => {
    if (!slug || typeof slug !== 'string') {
      console.warn(`[KioskService] ⚠️  ${ts()} | join:station called with invalid slug from ${socket.id}`);
      return;
    }
    const room = `station:${slug}`;
    socket.join(room);
    joinedRooms.add(room);
    console.log(`[KioskService] 🚪 ${ts()} | ${socket.id} joined ${room}`);
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

  // ----- disconnect ---------------------------------------------------------
  socket.on('disconnect', (reason) => {
    console.log(
      `[KioskService] ❌ ${ts()} | Client disconnected: ${socket.id} | reason: ${reason} | rooms: [${[...joinedRooms].join(', ')}]`,
    );
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
