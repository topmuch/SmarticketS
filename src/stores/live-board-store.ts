/**
 * Live Board Store — Zustand store for the BusGo Live Board (passenger PWA).
 *
 * Manages:
 * - Favorite destinations (persisted to localStorage)
 * - Active filter (all / favorites)
 * - Cached trips for offline display (last known state)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LiveTrip {
  id: string;
  lineNumber: string;
  origin: string;
  destination: string;
  scheduledTime: string; // ISO
  platform: string | null;
  status: string; // SCHEDULED | BOARDING | DEPARTED | CANCELLED | DELAYED
  delayMinutes: number;
  availableSeats: number;
  totalSeats: number;
  agentName: string | null;
  agentPhone: string | null;
  gpsPosition?: { lat: number; lng: number } | null;
  etaMinutes?: number | null;
  boardingStartedAt?: string | null;
  departedAt?: string | null;
}

interface LiveBoardState {
  // Favorites
  favorites: string[]; // destination names
  toggleFavorite: (destination: string) => void;
  isFavorite: (destination: string) => boolean;

  // Filter
  activeFilter: 'all' | 'favorites';
  setActiveFilter: (filter: 'all' | 'favorites') => void;

  // Cached trips (for offline)
  cachedTrips: LiveTrip[];
  setCachedTrips: (trips: LiveTrip[]) => void;

  // Selected station (for socket subscription)
  stationSlug: string | null;
  setStationSlug: (slug: string | null) => void;
}

export const useLiveBoardStore = create<LiveBoardState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (destination) =>
        set((state) => ({
          favorites: state.favorites.includes(destination)
            ? state.favorites.filter((d) => d !== destination)
            : [...state.favorites, destination],
        })),
      isFavorite: (destination) => get().favorites.includes(destination),

      activeFilter: 'all',
      setActiveFilter: (filter) => set({ activeFilter: filter }),

      cachedTrips: [],
      setCachedTrips: (trips) => set({ cachedTrips: trips }),

      stationSlug: null,
      setStationSlug: (slug) => set({ stationSlug: slug }),
    }),
    {
      name: 'busgo-live-board',
      partialize: (state) => ({
        favorites: state.favorites,
        activeFilter: state.activeFilter,
        cachedTrips: state.cachedTrips.slice(0, 50), // cache max 50 for offline
      }),
    }
  )
);
