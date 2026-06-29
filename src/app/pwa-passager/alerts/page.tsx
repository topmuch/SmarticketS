'use client';

/**
 * PWA Passager — Page Alertes/Notifications
 *
 * Affiche l'historique des notifications reçues par le passager :
 * - Confirmation d'achat
 * - Rappels (H-1h, H-45min, H-30min, H-5min)
 * - Retards
 * - Départ confirmé
 * - Annulations
 */

import { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle2, AlertCircle, Bus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationLog {
  id: string;
  templateType: string;
  messageText: string;
  ttsText: string;
  sentAt: string;
  status: string;
}

const TYPE_INFO: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  purchase_confirm: { label: 'Achat confirmé', icon: CheckCircle2, color: 'text-emerald-400' },
  reminder_1h: { label: 'Rappel H-1h', icon: Clock, color: 'text-blue-400' },
  bags_45min: { label: 'Bagages H-45min', icon: AlertCircle, color: 'text-amber-400' },
  boarding_30min: { label: 'Embarquement H-30min', icon: Bell, color: 'text-orange-400' },
  departure_5min: { label: 'Départ H-5min', icon: Bus, color: 'text-rose-400' },
  delay_notice: { label: 'Retard', icon: Clock, color: 'text-orange-400' },
  boarding_started: { label: 'Embarquement démarré', icon: Bell, color: 'text-amber-400' },
  departure_confirmed: { label: 'Bus parti', icon: Bus, color: 'text-emerald-400' },
  cancellation: { label: 'Annulation', icon: X, color: 'text-rose-400' },
};

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('busgo_ticket_id');
    setTicketId(id);
  }, []);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`/api/pwa-passager/notifications/log?ticketId=${ticketId}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [ticketId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Bell className="h-6 w-6 text-orange-500" />
        <h1 className="text-xl font-bold">Alertes</h1>
        {notifications.length > 0 && (
          <Badge variant="outline" className="ml-auto text-orange-400 border-orange-400">
            {notifications.length}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      )}

      {/* No ticket */}
      {!loading && !ticketId && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center text-slate-400">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun billet actif.</p>
            <p className="text-xs mt-1">Activez un billet pour recevoir des alertes.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && ticketId && notifications.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p>Aucune alerte pour le moment.</p>
            <p className="text-xs mt-1">Vous recevrez des notifications pour les rappels et changements de statut.</p>
          </CardContent>
        </Card>
      )}

      {/* Notifications list */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const info = TYPE_INFO[notif.templateType] || { label: notif.templateType, icon: Bell, color: 'text-slate-400' };
            const Icon = info.icon;
            return (
              <Card key={notif.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('shrink-0 mt-0.5', info.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{info.label}</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {new Date(notif.sentAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{notif.messageText}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
