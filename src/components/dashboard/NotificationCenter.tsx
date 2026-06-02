'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Package, AlertTriangle, CheckCircle, Clock, Info, Trash2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ─── Types ──────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  agencyId: string | null;
  baggageId: string | null;
}

interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    unreadCount: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function getNotificationIcon(type: string) {
  switch (type) {
    case 'departure_sender':
    case 'departure_receiver':
      return <Package className="size-4 text-blue-500" />;
    case 'arrival_sender':
    case 'arrival_receiver':
      return <CheckCircle className="size-4 text-green-500" />;
    case 'alert':
      return <AlertTriangle className="size-4 text-amber-500" />;
    case 'system':
      return <Info className="size-4 text-gray-500" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

function getNotificationLabel(type: string): string {
  switch (type) {
    case 'departure_sender': return 'Départ — Expéditeur';
    case 'departure_receiver': return 'Départ — Destinataire';
    case 'arrival_sender': return 'Arrivée — Expéditeur';
    case 'arrival_receiver': return 'Arrivée — Destinataire';
    case 'alert': return 'Alerte';
    case 'system': return 'Système';
    case 'baggage_declared_lost': return 'Colis perdu';
    case 'baggage_found': return 'Colis trouvé';
    case 'new_assistance_message': return 'Assistance';
    case 'urgent_scan': return 'Scan urgent';
    default: return type;
  }
}

/**
 * Format a date to a relative time string in French.
 * e.g. "il y a 5 min", "il y a 2h", "il y a 3 jours"
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'À l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHour < 24) return `il y a ${diffHour}h`;
  if (diffDay === 1) return 'Hier';
  if (diffDay < 7) return `il y a ${diffDay} jours`;

  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Component ───────────────────────────────────────────────

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10&read=false');
      if (res.ok) {
        const json: NotificationsResponse = await res.json();
        setNotifications(json.data);
        setUnreadCount(json.meta.unreadCount);
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=0&read=false');
      if (res.ok) {
        const json: NotificationsResponse = await res.json();
        setUnreadCount(json.meta.unreadCount);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Erreur lors du marquage');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success(`${json.count} notification(s) marquée(s) comme lue(s)`);
      }
    } catch {
      toast.error('Erreur lors du marquage');
    } finally {
      setMarkingAllRead(false);
    }
  }, []);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();

    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 60_000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchUnreadCount]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-base">Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="p-0">
          <ScrollArea className="max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Bell className="size-8 mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
                <p className="text-xs mt-1">Les nouvelles notifications apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      !notification.read
                        ? 'bg-muted/50 hover:bg-muted'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    onSelect={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {getNotificationLabel(notification.type)}
                        </span>
                        {!notification.read && (
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuGroup>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={markAllAsRead}
                disabled={markingAllRead || unreadCount === 0}
              >
                <CheckCheck className="size-4" />
                {markingAllRead ? 'Marquage...' : 'Marquer tout comme lu'}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
