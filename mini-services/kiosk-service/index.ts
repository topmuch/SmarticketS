import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3004;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Rooms per station slug
// Events:
// 'join:station' — client joins a station room
// 'kiosk:update' — broadcast to all clients in a station room
//   payload: { type: 'delay' | 'departed' | 'config' | 'emergency', data: any }
// 'kiosk:config' — broadcast config changes (volume, mute, general message)

io.on('connection', (socket) => {
  console.log(`[KioskService] Client connected: ${socket.id}`);

  socket.on('join:station', (slug: string) => {
    socket.join(`station:${slug}`);
    console.log(`[KioskService] Client ${socket.id} joined station: ${slug}`);
  });

  socket.on('leave:station', (slug: string) => {
    socket.leave(`station:${slug}`);
  });

  socket.on('kiosk:broadcast', (payload: { stationSlug: string; event: string; data: any }) => {
    io.to(`station:${payload.stationSlug}`).emit(payload.event, payload.data);
    console.log(`[KioskService] Broadcast to station:${payload.stationSlug}: ${payload.event}`);
  });

  // Admin sends delay
  socket.on('kiosk:delay', (payload: { stationSlug: string; departureId: string; minutes: number; destination: string }) => {
    io.to(`station:${payload.stationSlug}`).emit('kiosk:delay', {
      departureId: payload.departureId,
      minutes: payload.minutes,
      destination: payload.destination,
      timestamp: Date.now(),
    });
  });

  // Admin sends departed
  socket.on('kiosk:departed', (payload: { stationSlug: string; departureId: string; destination: string }) => {
    io.to(`station:${payload.stationSlug}`).emit('kiosk:departed', {
      departureId: payload.departureId,
      destination: payload.destination,
      timestamp: Date.now(),
    });
  });

  // Admin sends config update (volume, mute, general message)
  socket.on('kiosk:config', (payload: { stationSlug: string; config: any }) => {
    io.to(`station:${payload.stationSlug}`).emit('kiosk:config', payload.config);
  });

  socket.on('disconnect', () => {
    console.log(`[KioskService] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[KioskService] Running on port ${PORT}`);
});
