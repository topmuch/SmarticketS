'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bus,
  Clock,
  MapPin,
  ArrowRight,
  ArrowRightLeft,
  Search,
  Calendar,
  Filter,
  X,
  ChevronDown,
  Users,
  Armchair,
  AlertTriangle,
  Loader2,
  Monitor,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// ─── Types ────────────────────────────────────────────────────────────

interface Agency {
  id: string;
  name: string;
  slug: string;
}

interface ScheduleDeparture {
  id: string;
  lineNumber: string;
  destination: string;
  departureType: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string;
  status: string;
  delayMinutes: number;
  availableSeats: number;
  totalSeats: number;
  occupancy: number;
  countdownMin: number;
  isToday: boolean;
}

interface ScheduleRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  isRoundTrip: boolean;
  durationMinutes: number | null;
  distanceKm: number | null;
  price: number | null;
  agency: Agency;
  departures: ScheduleDeparture[];
}

interface StandaloneDeparture extends ScheduleDeparture {
  routeId: null;
  routeName: null;
  origin: string | null;
  agency: Agency;
}

interface ScheduleFilters {
  origins: string[];
  destinations: string[];
  agencies: Agency[];
}

interface ScheduleData {
  routes: ScheduleRoute[];
  standaloneDepartures: StandaloneDeparture[];
  filters: ScheduleFilters;
  searchDate: string;
  totalResults: number;
}

// ─── Status Config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Planifié', color: 'text-sky-700', bg: 'bg-sky-100' },
  BOARDING: { label: 'Embarquement', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  DELAYED: { label: 'Retardé', color: 'text-amber-700', bg: 'bg-amber-100' },
  DEPARTED: { label: 'Parti', color: 'text-gray-500', bg: 'bg-gray-100' },
};

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Main Component ───────────────────────────────────────────────────

export default function HorairesPage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [originUrl, setOriginUrl] = useState('');

  // Get origin URL on mount (avoids hydration mismatch with SSR)
  useEffect(() => {
    setOriginUrl(window.location.origin);
  }, []);

  // Filters
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (origin) params.set('origin', origin);
      if (destination) params.set('destination', destination);
      if (selectedDate) params.set('date', selectedDate);
      if (selectedAgency) params.set('agencyId', selectedAgency);

      const res = await fetch(`/api/schedules?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Impossible de charger les horaires. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [origin, destination, selectedDate, selectedAgency]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Set today's date as default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Combined departures for "all departures" view
  const allDepartures = useMemo(() => {
    if (!data) return [];

    const deps: (ScheduleDeparture & { agency: Agency; routeName: string | null; origin: string | null })[] = [];

    for (const route of data.routes) {
      for (const dep of route.departures) {
        deps.push({ ...dep, agency: route.agency, routeName: route.name, origin: route.origin });
      }
    }
    for (const dep of data.standaloneDepartures) {
      deps.push(dep);
    }

    return deps.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [data]);

  // Format helpers
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatCountdown = (min: number) => {
    if (min < 0) return 'Parti';
    if (min === 0) return 'Maintenant';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const getCountdownColor = (min: number, status: string) => {
    if (status === 'DEPARTED') return 'text-gray-400';
    if (min <= 5) return 'text-red-600 font-bold';
    if (min <= 15) return 'text-amber-600 font-bold';
    return 'text-emerald-600 font-bold';
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h}h` : `${h}h${m}`;
  };

  const hasActiveFilters = origin || destination || selectedAgency;

  const clearFilters = () => {
    setOrigin('');
    setDestination('');
    setSelectedAgency('');
  };

  return (
    <SecondaryPageLayout
      title="Horaires des Départs"
      subtitle="Consultez les horaires de transport en temps réel. Recherchez par trajet, date et agence."
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ─── Search Bar ────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Main search fields */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Origin */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Départ de
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition appearance-none cursor-pointer"
                  >
                    <option value="">Toutes les origines</option>
                    {(data?.filters.origins || []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Destination */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Arrivée à
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6B35]" />
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition appearance-none cursor-pointer"
                  >
                    <option value="">Toutes les destinations</option>
                    {(data?.filters.destinations || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition cursor-pointer"
                  />
                </div>
              </div>

              {/* Agency */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Agence
                </label>
                <div className="relative">
                  <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedAgency}
                    onChange={(e) => setSelectedAgency(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition appearance-none cursor-pointer"
                  >
                    <option value="">Toutes les agences</option>
                    {(data?.filters.agencies || []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Active filters bar */}
          {hasActiveFilters && (
            <div className="px-4 sm:px-6 py-3 bg-[#FFF7ED] border-t border-[#FFEDD5] flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-xs font-medium text-[#FF6B35]">Filtres actifs :</span>
              {origin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-xs font-medium text-slate-700 border border-slate-200">
                  {origin}
                  <button onClick={() => setOrigin('')} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {destination && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-xs font-medium text-slate-700 border border-slate-200">
                  {destination}
                  <button onClick={() => setDestination('')} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAgency && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-xs font-medium text-slate-700 border border-slate-200">
                  {data?.filters.agencies.find((a) => a.id === selectedAgency)?.name}
                  <button onClick={() => setSelectedAgency('')} className="text-slate-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="ml-auto text-xs font-medium text-slate-500 hover:text-[#FF6B35] transition-colors"
              >
                Effacer tout
              </button>
            </div>
          )}
        </motion.div>

        {/* ─── Stats Summary ────────────────────────────────────── */}
        {data && !loading && (
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF6B35]" />
              <span>
                <strong className="text-slate-800">{selectedDate ? formatDate(selectedDate) : "Aujourd'hui"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-[#FF6B35]" />
              <span>
                <strong className="text-slate-800">{data.totalResults}</strong> résultat{data.totalResults > 1 ? 's' : ''}
              </span>
            </div>
            {data.routes.length > 0 && (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#FF6B35]" />
                <span>
                  <strong className="text-slate-800">{data.routes.length}</strong> trajet{data.routes.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Loading State ─────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Chargement des horaires...</p>
          </div>
        )}

        {/* ─── Error State ───────────────────────────────────────── */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={fetchSchedules}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ─── Empty State ───────────────────────────────────────── */}
        {data && !loading && !error && data.totalResults === 0 && (
          <motion.div variants={itemVariants} className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Aucun départ trouvé</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Il n&apos;y a pas de départs prévus pour cette recherche. Essayez une autre date ou destination.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-medium text-sm hover:bg-[#e55a28] transition shadow-lg shadow-[#FF6B35]/25"
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        )}

        {/* ─── Schedule Results ────────────────────────────────── */}
        {data && !loading && !error && data.totalResults > 0 && (
          <div className="space-y-6">
            {/* Route-based departures */}
            {data.routes.map((route) => (
              <motion.div
                key={route.id}
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Route Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-slate-100">
                  <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                        {route.isRoundTrip ? (
                          <ArrowRightLeft className="w-5 h-5 text-[#FF6B35]" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-[#FF6B35]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#0A2540] flex items-center gap-2 flex-wrap">
                          <span>{route.origin}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span>{route.destination}</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <Link
                            href={`/agency/${route.agency.slug}`}
                            className="text-xs font-medium text-[#FF6B35] hover:underline"
                          >
                            {route.agency.name}
                          </Link>
                          {route.isRoundTrip && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              Aller-Retour
                            </span>
                          )}
                          {route.durationMinutes && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatDuration(route.durationMinutes)}
                            </span>
                          )}
                          {route.distanceKm && (
                            <span className="text-xs text-slate-500">{route.distanceKm} km</span>
                          )}
                          {route.price && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                              {route.price.toLocaleString('fr-FR')} FCFA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      {route.departures.length} départ{route.departures.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Departure Cards */}
                <div className="divide-y divide-slate-100">
                  {route.departures.map((dep) => {
                    const statusCfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.SCHEDULED;
                    return (
                      <div
                        key={dep.id}
                        className="p-4 sm:px-5 sm:py-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            {/* Time */}
                            <div className="flex-shrink-0 text-center">
                              <div className={`text-2xl font-mono font-bold ${dep.status === 'BOARDING' ? 'text-emerald-600' : 'text-[#0A2540]'}`}>
                                {formatTime(dep.effectiveTime)}
                              </div>
                              {dep.delayMinutes > 0 && dep.status !== 'DEPARTED' && (
                                <div className="text-xs text-amber-600 flex items-center gap-1 justify-center">
                                  <AlertTriangle className="w-3 h-3" />
                                  +{dep.delayMinutes} min
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800 truncate">
                                  {dep.lineNumber}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  dep.departureType === 'RETURN' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                                }`}>
                                  {dep.departureType === 'RETURN' ? 'Retour' : 'Aller'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {dep.platform && dep.platform !== '-' && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <MapPin className="w-3 h-3" />
                                    Quai {dep.platform}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Armchair className="w-3 h-3" />
                                  {dep.availableSeats} place{dep.availableSeats > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status + Occupancy */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Occupancy bar */}
                            <div className="hidden sm:flex items-center gap-2">
                              <div className="w-20 bg-slate-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    dep.occupancy > 90 ? 'bg-red-500' : dep.occupancy > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, dep.occupancy)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 w-8 text-right">
                                {dep.occupancy}%
                              </span>
                            </div>

                            {/* Countdown */}
                            {dep.isToday && (
                              <div className={`text-lg font-mono font-bold ${getCountdownColor(dep.countdownMin, dep.status)}`}>
                                {formatCountdown(dep.countdownMin)}
                              </div>
                            )}

                            {/* Status badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCfg.color} ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {/* Standalone departures (no route) */}
            {data.standaloneDepartures.length > 0 && (
              <motion.div variants={itemVariants}>
                <h2 className="text-lg font-bold text-[#0A2540] mb-4 flex items-center gap-2">
                  <Bus className="w-5 h-5 text-[#FF6B35]" />
                  Autres Départs
                </h2>
                <div className="space-y-3">
                  {data.standaloneDepartures.map((dep) => {
                    const statusCfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.SCHEDULED;
                    return (
                      <div
                        key={dep.id}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex-shrink-0 text-center">
                              <div className="text-2xl font-mono font-bold text-[#0A2540]">
                                {formatTime(dep.effectiveTime)}
                              </div>
                              {dep.delayMinutes > 0 && dep.status !== 'DEPARTED' && (
                                <div className="text-xs text-amber-600 flex items-center gap-1 justify-center">
                                  <AlertTriangle className="w-3 h-3" />
                                  +{dep.delayMinutes} min
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{dep.lineNumber}</span>
                                <span className="text-xs text-slate-500">→</span>
                                <span className="text-sm font-medium text-[#FF6B35] truncate">{dep.destination}</span>
                              </div>
                              <Link
                                href={`/agency/${dep.agency.slug}`}
                                className="text-xs text-slate-500 hover:text-[#FF6B35] transition-colors"
                              >
                                {dep.agency.name}
                              </Link>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className={`font-semibold ${dep.availableSeats <= 5 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {dep.availableSeats}
                              </span>
                            </div>
                            {dep.isToday && (
                              <div className={`text-lg font-mono font-bold ${getCountdownColor(dep.countdownMin, dep.status)}`}>
                                {formatCountdown(dep.countdownMin)}
                              </div>
                            )}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCfg.color} ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ─── QR Code Affichage Gare Section ─────────────────────── */}
        {originUrl && data && data.filters.agencies.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
                  <Monitor className="w-6 h-6 text-[#FF6B35]" />
                  Affichage Gare en Temps Réel
                </h3>
                <p className="text-slate-300 mb-4 max-w-md">
                  Scannez ce QR code pour afficher les horaires sur écran TV en gare.
                  Mise à jour automatique toutes les 15 secondes.
                </p>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="bg-slate-700 px-3 py-1 rounded-full">✅ Horloge Live</span>
                  <span className="bg-slate-700 px-3 py-1 rounded-full">⚠️ Alertes Retards</span>
                  <span className="bg-slate-700 px-3 py-1 rounded-full">🚌 Embarquement</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={`${originUrl}/signage/${data.filters.agencies[0]?.id || 'demo'}?kiosk=1`}
                    size={140}
                    fgColor="#1e3a8a"
                    bgColor="#ffffff"
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-slate-400 font-mono max-w-[180px] text-center break-all leading-relaxed">
                  {originUrl}/signage/{data.filters.agencies[0]?.id || 'demo'}
                </p>
                <a
                  href={`/signage/${data.filters.agencies[0].id}?kiosk=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF6B35] hover:text-[#FFB347] underline text-sm font-semibold transition-colors"
                >
                  Voir l&apos;affichage →
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Info Banner ──────────────────────────────────────── */}
        {data && !loading && data.totalResults > 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 rounded-2xl p-6 sm:p-8 text-center"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              🚌 Réservez votre billet
            </h3>
            <p className="text-white/70 mb-6 max-w-lg mx-auto">
              Activez votre billet directement en scannant le QR code ou saisissez votre référence pour démarrer.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#e55a28] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
            >
              <Search className="w-4 h-4" />
              Scanner un QR Code
            </Link>
          </motion.div>
        )}
      </motion.div>
    </SecondaryPageLayout>
  );
}
