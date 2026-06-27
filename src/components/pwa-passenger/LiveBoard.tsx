'use client';

/**
 * LiveBoard — Main real-time departure board for the BusGo passenger PWA.
 *
 * FitNexus dashboard layout:
 *   - Fixed sidebar (220px, hidden on mobile): light teal bg, BusGo logo,
 *     nav items (Horaires active=teal, Mon Billet, Alertes, Profil),
 *     BusGo Pro upgrade card at bottom (teal gradient).
 *   - Header bar: logo + search + favorites toggle + connection status +
 *     user avatar circle.
 *   - KPI cards row (4 colored metric cards):
 *       1. Total départs (teal #10B981)
 *       2. Embarquement (orange #F97316)
 *       3. Places dispo (blue #3B82F6)
 *       4. Retards (pink #EC4899)
 *   - Trip list section: white card "Départs du jour" + "See more" link,
 *     "Embarquement en cours" pinned at top with pulse indicator,
 *     other trips grouped by destination with sticky sub-headers.
 *   - BottomNav fixed at the bottom (mobile only).
 *
 * Data:
 *   - `useLiveTrips` hook (Socket.io + REST fallback)
 *   - `useLiveBoardStore` for favorites + activeFilter (persisted)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Star,
  Loader2,
  AlertCircle,
  WifiOff,
  Radio,
  Bus,
  Home,
  Ticket,
  Bell,
  User,
  Calendar,
  Users,
  Armchair,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
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

// --- Sidebar ---------------------------------------------------------------

interface SidebarItem {
  key: 'board' | 'ticket' | 'alerts' | 'profile';
  label: string;
  href: string;
  icon: typeof Home;
  badge?: number;
  disabled?: boolean;
}

function Sidebar({ ticketId, alertsCount }: { ticketId?: string | null; alertsCount: number }) {
  const items: SidebarItem[] = [
    { key: 'board', label: 'Horaires', href: '/pwa-passager', icon: Home },
    {
      key: 'ticket',
      label: 'Mon Billet',
      href: ticketId ? '/pwa-passager/ticket' : '#',
      icon: Ticket,
      disabled: !ticketId,
    },
    {
      key: 'alerts',
      label: 'Alertes',
      href: '/pwa-passager/alerts',
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : undefined,
    },
    { key: 'profile', label: 'Profil', href: '/pwa-passager/settings', icon: User },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-emerald-100 bg-emerald-50/60 md:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg shadow-sm">
          🚌
        </span>
        <span className="text-lg font-bold text-gray-800">BusGo</span>
      </div>

      {/* Nav items */}
      <nav aria-label="Navigation latérale" className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === 'board';
          if (item.disabled) {
            return (
              <span
                key={item.key}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-emerald-100/60 hover:text-gray-800',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade card */}
      <div className="px-3 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">BusGo Pro</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-50">
            Notifications illimitées, trajets favoris et priorité d&apos;embarquement.
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            Découvrir
          </button>
        </div>
      </div>
    </aside>
  );
}

// --- KPI card --------------------------------------------------------------

interface KpiCardProps {
  title: string;
  value: number | string;
  subtext: string;
  icon: typeof Calendar;
  color: 'teal' | 'orange' | 'blue' | 'pink';
}

const KPI_COLORS: Record<KpiCardProps['color'], string> = {
  teal: 'bg-emerald-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  pink: 'bg-pink-500',
};

function KpiCard({ title, value, subtext, icon: Icon, color }: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl p-5 text-white shadow-sm transition-transform duration-200 hover:scale-[1.02]',
        KPI_COLORS[color],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-white/90">
          {title}
        </span>
        <Icon className="h-4 w-4 text-white/80" />
      </div>
      <span className="text-3xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[11px] font-medium text-white/85">{subtext}</span>
    </div>
  );
}

// --- Main component --------------------------------------------------------

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

  const { boarding, grouped, totalOthers, totals } = useMemo(() => {
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
    boarding.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    // 5) KPI totals (always computed from the FULL trips list, not the filtered one,
    //    so the dashboard metrics reflect the station reality)
    const totalDepartures = trips.length;
    const boardingCount = trips.filter((t) => t.status === 'BOARDING').length;
    const availableSeats = trips.reduce((sum, t) => sum + (t.availableSeats || 0), 0);
    const delayedCount = trips.filter((t) => t.status === 'DELAYED').length;

    return {
      boarding,
      grouped,
      totalOthers: others.length,
      totals: { totalDepartures, boardingCount, availableSeats, delayedCount },
    };
  }, [trips, activeFilter, favorites]);

  const groupedDestinations = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // --- Render ----------------------------------------------------------

  const showEmptyState = !loading && trips.length === 0 && !error;
  const showNoMatches =
    !loading && trips.length > 0 && boarding.length === 0 && totalOthers === 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-8">
      <Sidebar ticketId={ticketId} alertsCount={alertsCount} />

      {/* Main content (offset by sidebar on md+) */}
      <div className="md:pl-[220px]">
        {/* --- Header bar --- */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile logo / Desktop title */}
            <div className="flex items-center gap-2">
              <span className="text-lg md:hidden">🚌</span>
              <h1 className="text-base font-bold text-gray-800 md:text-lg">
                <span className="md:hidden">BusGo Live</span>
                <span className="hidden md:inline">Tableau de bord</span>
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  connected
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600',
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {connected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-1.5 w-1.5 rounded-full',
                      connected ? 'bg-emerald-500' : 'bg-red-500',
                    )}
                  />
                </span>
                {connected ? 'Connecté' : 'Hors ligne'}
              </span>
            </div>

            {/* Search + favorites + avatar */}
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  inputMode="search"
                  placeholder="Rechercher une destination, une ligne…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-64 border-gray-200 bg-gray-50 pl-9 text-sm text-gray-800 placeholder:text-gray-400 focus-visible:border-emerald-400 focus-visible:ring-1 focus-visible:ring-emerald-400"
                />
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
                  'h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                  activeFilter === 'favorites' && 'bg-amber-50 text-amber-500 hover:bg-amber-50 hover:text-amber-600',
                )}
              >
                <Star
                  className={cn(
                    'h-4 w-4 transition-colors',
                    activeFilter === 'favorites' ? 'fill-amber-400 text-amber-400' : '',
                  )}
                />
              </Button>

              {/* Mobile search button (compact) */}
              <div className="relative sm:hidden">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  inputMode="search"
                  placeholder="Rechercher…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-36 border-gray-200 bg-gray-50 pl-9 text-sm text-gray-800 placeholder:text-gray-400 focus-visible:border-emerald-400 focus-visible:ring-1 focus-visible:ring-emerald-400"
                />
              </div>

              {/* User avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white shadow-sm"
                aria-label="Mon profil"
              >
                BG
              </div>
            </div>
          </div>

          {/* Offline notice */}
          {!connected && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-600">
              <WifiOff className="h-3 w-3" /> Mode hors ligne — affichage des dernières données connues
            </p>
          )}
        </header>

        {/* --- Body --- */}
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
          {/* KPI cards row */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <KpiCard
              title="Total départs"
              value={totals.totalDepartures}
              subtext="aujourd'hui"
              icon={Calendar}
              color="teal"
            />
            <KpiCard
              title="Embarquement"
              value={totals.boardingCount}
              subtext="en cours maintenant"
              icon={Users}
              color="orange"
            />
            <KpiCard
              title="Places dispo"
              value={totals.availableSeats}
              subtext="restantes au total"
              icon={Armchair}
              color="blue"
            />
            <KpiCard
              title="Retards"
              value={totals.delayedCount}
              subtext={totals.delayedCount === 1 ? 'trajet impacté' : 'trajets impactés'}
              icon={Clock}
              color="pink"
            />
          </section>

          {/* Trip list section (white card) */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
            {/* Section header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Départs du jour</h2>
                <p className="text-xs text-gray-500">
                  {trips.length} trajet{trips.length > 1 ? 's' : ''} programmé{trips.length > 1 ? 's' : ''}
                  {activeFilter === 'favorites' && ' · favoris uniquement'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Voir plus
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <p className="text-sm">Chargement des prochains départs…</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <p className="text-sm font-medium text-red-700">
                  Impossible de charger les départs
                </p>
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            {/* Empty state: no trips at all */}
            {showEmptyState && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <Bus className="h-10 w-10 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Aucun trajet programmé</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Revenez plus tard ou changez de gare pour voir les prochains départs.
                  </p>
                </div>
              </div>
            )}

            {/* No matches for current search/filter */}
            {showNoMatches && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <Search className="h-8 w-8 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Aucun trajet ne correspond</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Essayez un autre terme de recherche ou désactivez le filtre favoris.
                  </p>
                </div>
                {activeFilter === 'favorites' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    onClick={() => setActiveFilter('all')}
                  >
                    Voir tous les trajets
                  </Button>
                )}
              </div>
            )}

            {/* Boarding section (pinned, pulse) */}
            {!loading && boarding.length > 0 && (
              <div className="mb-5">
                <div className="sticky top-[68px] z-10 -mx-4 mb-3 flex items-center gap-2 rounded-md bg-orange-50 px-4 py-2 md:-mx-5 md:top-[72px]">
                  <Radio className="h-4 w-4 animate-pulse text-orange-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    {BOARDING_TITLE}
                  </h3>
                  <span className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
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
              </div>
            )}

            {/* Other trips grouped by destination */}
            {!loading &&
              groupedDestinations.map((dest) => {
                const list = grouped[dest];
                if (!list || list.length === 0) return null;
                return (
                  <div key={dest} className="mb-5 last:mb-0">
                    <div className="sticky top-[68px] z-10 -mx-4 mb-3 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur md:-mx-5 md:top-[72px]">
                      <h3 className="truncate text-sm font-semibold text-gray-800">{dest}</h3>
                      <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
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
                  </div>
                );
              })}
          </section>
        </main>
      </div>

      {/* --- Bottom sheet detail modal --- */}
      {selectedTrip && (
        <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}

      {/* --- Bottom navigation (mobile only) --- */}
      <BottomNav active="board" ticketId={ticketId} alertsCount={alertsCount} />
    </div>
  );
}

export default LiveBoard;
