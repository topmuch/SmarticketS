'use client';

/**
 * LiveBoard — Main real-time departure board for the BusGo passenger PWA.
 *
 * Layout (app-native dark style):
 *   - Sticky orange gradient header
 *     · title "🚌 BusGo Live" + live connection dot
 *     · favorite toggle (Star) + search input
 *   - Scrollable body:
 *     · "Embarquement en cours" pinned section (pulse animation) — BOARDING trips
 *     · Other trips grouped by destination with sticky sub-headers
 *     · Empty state when search yields nothing
 *   - TripDetailModal opens when a TripCard is tapped
 *   - BottomNav fixed at the bottom
 *
 * Data:
 *   - `useLiveTrips` hook (Socket.io + REST fallback)
 *   - `useLiveBoardStore` for favorites + activeFilter (persisted)
 */

import { useEffect, useMemo, useState } from 'react';
import { Search, Star, Loader2, AlertCircle, WifiOff, Radio, Bus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLiveTrips } from '@/hooks/use-live-trips';
import { useLiveBoardStore, type LiveTrip } from '@/stores/live-board-store';
import { TripCard } from './TripCard';
import { TripDetailModal } from './TripDetailModal';
import { BottomNav } from './BottomNav';

export interface LiveBoardProps {
  /** Slug of the station to subscribe to (passed to useLiveTrips). */
  stationSlug?: string | null;
  /** Passenger ticket id (for the BottomNav "Mon Billet" link). */
  ticketId?: string | null;
  /** Unread alert count (badge on the BottomNav "Alertes" item). */
  alertsCount?: number;
}

const BOARDING_TITLE = 'Embarquement en cours';

export function LiveBoard({ stationSlug, ticketId, alertsCount = 0 }: LiveBoardProps) {
  // Local search input (controlled, with debounce)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<LiveTrip | null>(null);
  // Tick every 30s to refresh "Dans X min" labels
  const [, setTick] = useState(0);

  // Persisted UI state
  const activeFilter = useLiveBoardStore((s) => s.activeFilter);
  const setActiveFilter = useLiveBoardStore((s) => s.setActiveFilter);
  const favorites = useLiveBoardStore((s) => s.favorites);

  // Live trips subscription (Socket.io + REST polling fallback)
  const { trips, loading, error, connected } = useLiveTrips({
    search: debouncedSearch,
    stationSlug: stationSlug ?? null,
  });

  // Debounce the search input → debouncedSearch (300ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Periodic re-render to keep "Dans X min" fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // --- Sort & group ----------------------------------------------------

  const { boarding, grouped, totalOthers } = useMemo(() => {
    // 1) Apply favorites filter
    const visible =
      activeFilter === 'favorites'
        ? trips.filter((t) => favorites.includes(t.destination))
        : trips;

    // 2) Split boarding vs others
    const boarding = visible.filter((t) => t.status === 'BOARDING');
    const others = visible.filter((t) => t.status !== 'BOARDING');

    // 3) Group others by destination
    const grouped: Record<string, LiveTrip[]> = {};
    others.forEach((trip) => {
      const dest = trip.destination || 'Autre';
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(trip);
    });

    // 4) Sort each group by scheduledTime ascending
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
    });
    // Sort boarding by scheduledTime too
    boarding.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    return { boarding, grouped, totalOthers: others.length };
  }, [trips, activeFilter, favorites]);

  const groupedDestinations = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // --- Render ----------------------------------------------------------

  const showEmptyState = !loading && trips.length === 0 && !error;
  const showNoMatches = !loading && trips.length > 0 && boarding.length === 0 && totalOthers === 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-28">
      {/* --- Sticky header --- */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-orange-600 to-orange-500 px-4 pb-3 pt-4 shadow-lg shadow-black/20">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">🚌 BusGo Live</h1>
            <span
              className={cn(
                'inline-flex h-2 w-2 items-center justify-center rounded-full',
                connected ? 'bg-green-400' : 'bg-red-400',
              )}
              title={connected ? 'Connecté' : 'Hors ligne'}
            >
              {connected && (
                <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
              )}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-pressed={activeFilter === 'favorites'}
            aria-label={activeFilter === 'favorites' ? 'Afficher tous les trajets' : 'Afficher les favoris uniquement'}
            onClick={() =>
              setActiveFilter(activeFilter === 'favorites' ? 'all' : 'favorites')
            }
            className={cn(
              'h-9 w-9 rounded-full text-white hover:bg-white/15',
              activeFilter === 'favorites' && 'bg-white/15',
            )}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                activeFilter === 'favorites' ? 'fill-yellow-400 text-yellow-400' : 'text-white',
              )}
            />
          </Button>
        </div>

        <div className="mx-auto mt-3 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              type="search"
              inputMode="search"
              placeholder="Rechercher une destination, une ligne…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 border-0 bg-slate-800/90 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-300"
            />
          </div>
          {!connected && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-100">
              <WifiOff className="h-3 w-3" /> Mode hors ligne — affichage des dernières données connues
            </p>
          )}
        </div>
      </header>

      {/* --- Body --- */}
      <main className="mx-auto max-w-md space-y-5 px-4 py-4">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            <p className="text-sm">Chargement des prochains départs…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-sm font-medium text-red-300">
              Impossible de charger les départs
            </p>
            <p className="text-xs text-red-400/80">{error}</p>
          </div>
        )}

        {/* Empty state: no trips at all */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-12 text-center">
            <Bus className="h-10 w-10 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-300">Aucun trajet programmé</p>
              <p className="mt-1 text-xs text-slate-500">
                Revenez plus tard ou changez de gare pour voir les prochains départs.
              </p>
            </div>
          </div>
        )}

        {/* No matches for current search/filter */}
        {showNoMatches && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-12 text-center">
            <Search className="h-8 w-8 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-300">Aucun trajet ne correspond</p>
              <p className="mt-1 text-xs text-slate-500">
                Essayez un autre terme de recherche ou désactivez le filtre favoris.
              </p>
            </div>
            {activeFilter === 'favorites' && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                onClick={() => setActiveFilter('all')}
              >
                Voir tous les trajets
              </Button>
            )}
          </div>
        )}

        {/* Boarding section (pinned, pulse) */}
        {!loading && boarding.length > 0 && (
          <section aria-labelledby="boarding-heading">
            <div className="sticky top-[140px] z-20 -mx-4 mb-2 flex items-center gap-2 bg-slate-900/90 px-4 py-2 backdrop-blur">
              <Radio className="h-4 w-4 animate-pulse text-orange-500" />
              <h2
                id="boarding-heading"
                className="text-xs font-bold uppercase tracking-wide text-orange-400"
              >
                {BOARDING_TITLE}
              </h2>
              <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                {boarding.length}
              </span>
            </div>
            <div className="space-y-3">
              {boarding.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isBoarding
                  onClick={() => setSelectedTrip(trip)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Other trips grouped by destination */}
        {!loading &&
          groupedDestinations.map((dest) => {
            const list = grouped[dest];
            if (!list || list.length === 0) return null;
            return (
              <section key={dest} aria-labelledby={`dest-${dest}`}>
                <div className="sticky top-[140px] z-20 -mx-4 mb-2 flex items-center gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2 backdrop-blur">
                  <h2
                    id={`dest-${dest}`}
                    className="truncate text-sm font-semibold text-slate-200"
                  >
                    {dest}
                  </h2>
                  <span className="ml-auto shrink-0 rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {list.length} départ{list.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {list.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isBoarding={false}
                      onClick={() => setSelectedTrip(trip)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </main>

      {/* --- Bottom sheet detail modal --- */}
      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}

      {/* --- Bottom navigation --- */}
      <BottomNav active="board" ticketId={ticketId} alertsCount={alertsCount} />
    </div>
  );
}

export default LiveBoard;
