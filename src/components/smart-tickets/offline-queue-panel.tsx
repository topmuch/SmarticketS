'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Database,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowUpCircle,
} from 'lucide-react';
import {
  getAllQueueItems,
  retryFailedItems,
  clearFailedItems,
  removeSyncedItems,
  type SyncQueueItem,
} from '@/lib/offline-db';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { playSuccessSound, playErrorSound } from '@/lib/sync-manager';

const TYPE_LABELS: Record<string, string> = {
  ticket: '🎫 Ticket',
  parcel: '📦 Colis',
  deliver: '🚚 Livraison',
  confirm: '✅ Confirmation',
  scan: '🔍 Scan',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  pending: { label: 'En attente', variant: 'secondary', icon: Clock },
  syncing: { label: 'Synchronisation', variant: 'default', icon: Loader2 },
  synced: { label: 'Synchronisé', variant: 'outline', icon: CheckCircle2 },
  failed: { label: 'Échoué', variant: 'destructive', icon: XCircle },
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function OfflineQueuePanel() {
  const { isOnline, forceSync, refreshCounts } = useOfflineSync();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const allItems = await getAllQueueItems();
      // Sort by timestamp descending
      allItems.sort((a, b) => b.timestamp - a.timestamp);
      setItems(allItems);
    } catch {
      console.error('Failed to load queue items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRetryAll = async () => {
    setActionLoading('retry');
    try {
      const count = await retryFailedItems();
      playSuccessSound();
      await loadItems();
      await refreshCounts();
      // Auto-sync after retry
      await forceSync();
    } catch {
      playErrorSound();
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearFailed = async () => {
    setActionLoading('clear');
    try {
      const count = await clearFailedItems();
      playSuccessSound();
      await loadItems();
      await refreshCounts();
    } catch {
      playErrorSound();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    setActionLoading('cleanup');
    try {
      const count = await removeSyncedItems();
      playSuccessSound();
      await loadItems();
      await refreshCounts();
    } catch {
      playErrorSound();
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const syncedCount = items.filter((i) => i.status === 'synced').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <p className="text-2xl font-bold">{isOnline ? 'En ligne' : 'Hors-ligne'}</p>
              <p className="text-xs text-muted-foreground">Statut réseau</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{syncedCount}</p>
              <p className="text-xs text-muted-foreground">Synchronisés</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Échoués</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                File d'attente hors-ligne
              </CardTitle>
              <CardDescription>
                {items.length} élément(s) au total dans la file IndexedDB
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAll}
                disabled={failedCount === 0 || actionLoading === 'retry'}
              >
                {actionLoading === 'retry' ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <ArrowUpCircle size={14} className="mr-1" />
                )}
                Réessayer ({failedCount})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                disabled={syncedCount === 0 || actionLoading === 'cleanup'}
              >
                {actionLoading === 'cleanup' ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <RefreshCw size={14} className="mr-1" />
                )}
                Nettoyer
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={failedCount === 0 || actionLoading === 'clear'}
                  >
                    {actionLoading === 'clear' ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Trash2 size={14} className="mr-1" />
                    )}
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer les actions échouées ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {failedCount} action(s) échouée(s) seront définitivement supprimée(s). Cette
                      action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearFailed}>
                      Supprimer ({failedCount})
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">File d'attente vide</p>
              <p className="text-xs">Les actions effectuées hors-ligne apparaîtront ici</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {items.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="shrink-0">
                        <Badge variant={statusCfg.variant} className="text-xs">
                          <StatusIcon
                            size={12}
                            className={`mr-1 ${item.status === 'syncing' ? 'animate-spin' : ''}`}
                          />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {TYPE_LABELS[item.type] || item.type}
                          </span>
                          {item.retryCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              (tentative {item.retryCount})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {formatTime(item.timestamp)}
                          {item.errorMessage && ` — ${item.errorMessage}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-mono text-muted-foreground">
                          {JSON.stringify(item.payload).slice(0, 60)}…
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
