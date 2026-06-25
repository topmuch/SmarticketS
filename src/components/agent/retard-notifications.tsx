'use client';

/**
 * RetardNotifications — Gère les notifications de retard.
 *
 * Adapté de BusGo retard-notifications.tsx pour SmarticketS.
 *
 * Fonctions:
 *   - Surveille les départs et détecte les retards
 *   - Affiche une notification toast quand un retard est signalé
 *   - Permet à l'agent de signaler un retard (POST /api/agent/trajets/[id])
 *   - Déclenche une annonce vocale TTS
 */

import { useState, useCallback } from 'react';
import { AlertTriangle, Bell, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface DelayNotification {
  id: string;
  departureId: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  delayMinutes: number;
  timestamp: number;
}

interface RetardNotificationsProps {
  notifications: DelayNotification[];
  onDismiss: (id: string) => void;
  onSignalDelay?: (departureId: string, minutes: number) => Promise<void>;
}

export function RetardNotifications({
  notifications,
  onDismiss,
  onSignalDelay,
}: RetardNotificationsProps) {
  const [signalingId, setSignalingId] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState<Record<string, number>>({});

  const handleSignalDelay = useCallback(
    async (departureId: string, id: string) => {
      if (!onSignalDelay) return;
      const minutes = customMinutes[id] ?? 15;
      setSignalingId(id);
      try {
        await onSignalDelay(departureId, minutes);
        toast.success(`Retard de ${minutes}min signalé`);
        onDismiss(id);
      } catch (e) {
        toast.error('Erreur lors du signalement du retard');
        console.error(e);
      } finally {
        setSignalingId(null);
      }
    },
    [onSignalDelay, onDismiss, customMinutes]
  );

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <Card
          key={notif.id}
          className="border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20"
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="bg-rose-100 dark:bg-rose-900/40 rounded-lg p-2 shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    Ligne {notif.lineNumber} → {notif.destination}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    +{notif.delayMinutes}min
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Départ prévu :{' '}
                  {new Date(notif.scheduledTime).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {/* Quick actions for signaling delay */}
                {onSignalDelay && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Signaler :</span>
                    {[5, 15, 30, 60].map((min) => (
                      <Button
                        key={min}
                        size="sm"
                        variant={customMinutes[notif.id] === min ? 'default' : 'outline'}
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          setCustomMinutes((prev) => ({ ...prev, [notif.id]: min }))
                        }
                      >
                        {min}min
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 px-3 text-xs"
                      disabled={signalingId === notif.id}
                      onClick={() => handleSignalDelay(notif.departureId, notif.id)}
                    >
                      {signalingId === notif.id ? '...' : 'Confirmer'}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onDismiss(notif.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Hook utilitaire pour gérer la liste des notifications de retard.
 * À utiliser dans la page d'embarquement.
 */
export function useDelayNotifications() {
  const [notifications, setNotifications] = useState<DelayNotification[]>([]);

  const addNotification = useCallback((notif: Omit<DelayNotification, 'id' | 'timestamp'>) => {
    const id = `${notif.departureId}-${Date.now()}`;
    setNotifications((prev) => [
      ...prev,
      { ...notif, id, timestamp: Date.now() },
    ]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
  };
}
