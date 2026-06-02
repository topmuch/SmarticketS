'use client';

import { useOfflineSync } from '@/hooks/use-offline-sync';
import { Wifi, WifiOff, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';

export function OfflineStatusBar() {
  const { isOnline, pendingCount, failedCount, isSyncing, lastSyncResult, forceSync } = useOfflineSync();

  return (
    <TooltipProvider>
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        <AnimatePresence mode="wait">
          {/* OFFLINE BANNER */}
          {!isOnline && (
            <motion.div
              key="offline"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto bg-red-600 text-white px-4 py-2.5 shadow-lg"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <WifiOff size={16} className="shrink-0" />
                <span>MODE HORS-LIGNE</span>
                {pendingCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {pendingCount} action(s) en attente
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {failedCount} échouée(s)
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* SYNCING BANNER */}
          {isOnline && isSyncing && (
            <motion.div
              key="syncing"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto bg-emerald-600 text-white px-4 py-2.5 shadow-lg"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>Synchronisation en cours…</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {pendingCount} restante(s)
                </span>
              </div>
            </motion.div>
          )}

          {/* PENDING ACTIONS BANNER */}
          {isOnline && !isSyncing && pendingCount > 0 && (
            <motion.div
              key="pending"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto bg-amber-500 text-white px-4 py-2.5 shadow-lg"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Wifi size={16} className="shrink-0" />
                  <span className="hidden sm:inline">Connexion rétablie</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {pendingCount} synchronisation(s) en attente
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={forceSync}
                      disabled={isSyncing}
                      className="h-7 px-3 text-white hover:bg-white/20 border border-white/30"
                    >
                      {isSyncing ? (
                        <Loader2 size={14} className="animate-spin mr-1" />
                      ) : (
                        <RefreshCw size={14} className="mr-1" />
                      )}
                      Synchroniser
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Synchroniser {pendingCount} action(s) maintenant
                  </TooltipContent>
                </Tooltip>
              </div>
            </motion.div>
          )}

          {/* SYNC ERROR BANNER */}
          {isOnline && !isSyncing && failedCount > 0 && pendingCount === 0 && (
            <motion.div
              key="failed"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-auto bg-orange-600 text-white px-4 py-2.5 shadow-lg"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{failedCount} action(s) échouée(s) — Vérifiez la file d'attente</span>
              </div>
            </motion.div>
          )}

          {/* SYNC RESULT TOAST */}
          {isOnline && !isSyncing && lastSyncResult && (
            <motion.div
              key="result"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`pointer-events-auto text-white px-4 py-2.5 shadow-lg ${
                lastSyncResult.success
                  ? 'bg-emerald-600'
                  : lastSyncResult.failed > 0
                  ? 'bg-orange-600'
                  : 'bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-sm font-bold">
                {lastSyncResult.success ? (
                  <>
                    <Wifi size={16} className="shrink-0" />
                    <span>
                      {lastSyncResult.synced} action(s) synchronisée(s)
                      {lastSyncResult.synced === 0 && ' — Rien à synchroniser'}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>
                      {lastSyncResult.synced} ok, {lastSyncResult.failed} échoué(s),
                      {lastSyncResult.skipped} en attente
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
