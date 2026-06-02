'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

/**
 * RealtimeAlertListener — connects to the alert-service WebSocket
 * and displays sonner toasts for new/resolved alerts.
 *
 * - Connects to socket.io via /?XTransformPort=3003 (caddy gateway)
 * - Joins agency room after session load
 * - Listens for alert:new, alert:resolved events
 * - Auto-reconnect with exponential backoff
 * - Shows green/red connection status dot
 */

const ALERT_SERVICE_URL = '/?XTransformPort=3003';
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

interface AlertEvent {
  id: string;
  type: string;
  severity: string;
  category: string;
  title: string;
  message: string;
  agencyId: string;
  tripId?: string;
  baggageId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export default function RealtimeAlertListener() {
  const socketRef = useRef<Socket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agencyIdRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Ref to hold the connect function so reconnect can call it without circular deps
  const connectSocketRef = useRef<(agId: string | null) => void>(() => {});

  // Fetch the current session to get agencyId
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.agencyId) {
            agencyIdRef.current = data.agencyId;
            setAgencyId(data.agencyId);
          }
        }
      } catch {
        // Session fetch failed — will retry on reconnect
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    connectSocketRef.current = (agId: string | null) => {
      // Clear any pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // Cleanup existing connection
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);

      const socket = io(ALERT_SERVICE_URL, {
        transports: ['polling', 'websocket'],
        reconnection: false,
        timeout: 10_000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;

        if (agId) {
          socket.emit('agency:connect', { agencyId: agId });
        }
      });

      socket.on('agency:connected', (_data: { agencyId: string; message: string }) => {
        // agency room joined successfully
      });

      socket.on('alert:new', (alert: AlertEvent) => {
        if (alert.severity === 'critical') {
          toast.error(alert.title, {
            description: alert.message,
            duration: 8000,
          });
        } else if (alert.severity === 'warning') {
          toast.warning(alert.title, {
            description: alert.message,
            duration: 6000,
          });
        } else {
          toast.info(alert.title, {
            description: alert.message,
            duration: 5000,
          });
        }
      });

      socket.on('alert:resolved', (alert: AlertEvent) => {
        toast.success('Alerte résolue', {
          description: alert.title,
          duration: 4000,
        });
      });

      socket.on('alert:updated', (alert: AlertEvent) => {
        toast.info('Alerte mise à jour', {
          description: alert.title,
          duration: 4000,
        });
      });

      socket.on('disconnect', () => {
        setConnected(false);
        scheduleReconnect(agId);
      });

      socket.on('connect_error', (_error: Error) => {
        setConnected(false);
        scheduleReconnect(agId);
      });

      socket.on('error', (_error: { message: string }) => {
        // socket error occurred
      });

      socket.connect();
    };

    function scheduleReconnect(agId: string | null) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      const delay = backoffRef.current;

      reconnectTimerRef.current = setTimeout(() => {
        connectSocketRef.current(agId);
      }, delay);

      backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
    }

    // Connect when agencyId is available
    if (agencyId) {
      connectSocketRef.current(agencyId);
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [agencyId]);

  // If no agencyId, don't render (user not logged in or not agency member)
  if (!agencyId) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
          connected
            ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse'
        }`}
        title={connected ? 'Alertes en temps réel connecté' : 'Alertes déconnecté — reconnexion...'}
      />
      <span className="text-xs text-muted-foreground opacity-60">
        {connected ? 'Live' : 'Reconnecting...'}
      </span>
    </div>
  );
}
