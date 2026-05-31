'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck,
  MapPin,
  User,
  Navigation,
  Clock,
  Package,
  RefreshCw,
  LogOut,
  Weight,
  Loader2,
  Inbox,
} from 'lucide-react';
import { validatePwaToken, type PwaTokenPayload } from '@/lib/pwa-guard';

// ─── Types ────────────────────────────────────────────────────────────────

interface DeliveryItem {
  id: string;
  reference: string;
  departureCity: string | null;
  destination: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  pickupAddress: string | null;
  colisType: string | null;
  colisTypeOther: string | null;
  colisWeight: number | null;
  colisColor: string | null;
  paymentStatus: string;
  estimatedArrival: string | null;
  departureTime: string | null;
  whatsappOwner: string | null;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  retrievalPin: string | null;
}

type FetchState = 'loading' | 'loaded' | 'error' | 'unauthorized';

// ─── PWA Token state ─────────────────────────────────────────────────

interface PwaGuardState {
  verified: boolean;
  agencyName?: string;
  error?: string;
  expired?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getColisTypeLabel(colisType: string | null, colisTypeOther: string | null): string {
  if (colisType === 'OTHER' && colisTypeOther) return colisTypeOther;
  const labels: Record<string, string> = {
    VALISE: 'Valise',
    SAC: 'Sac',
    CARTON: 'Carton',
    BACKPACK: 'Sac à dos',
    CABIN: 'Cabine',
  };
  return colisType ? labels[colisType] || colisType : 'Colis';
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function DriverDeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  // ─── PWA Guard state ─────────────────────────────────────────────
  const [pwaGuard, setPwaGuard] = useState<PwaGuardState>({ verified: false });

  // ─── PWA Token validation on mount ─────────────────────────────────
  // Validates JWT token from URL query param. If valid, shows a verified
  // badge. If invalid/expired, the page still works but with a warning.

  useEffect(() => {
    const validateTokenFromUrl = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) return;

      const result = await validatePwaToken(token, 'driver');
      if (result.valid && result.payload) {
        setPwaGuard({ verified: true, agencyName: result.payload.agencyName });
        window.history.replaceState({}, '', '/driver/deliveries');
      } else {
        setPwaGuard({ verified: false, error: result.error, expired: result.error?.includes('expiré') });
        window.history.replaceState({}, '', '/driver/deliveries');
      }
    };
    validateTokenFromUrl();
  }, []);

  // ─── Fetch deliveries ────────────────────────────────────────────────

  const fetchDeliveries = useCallback(async () => {
    setFetchState('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/driver/deliveries');
      if (res.status === 401 || res.status === 403) {
        setFetchState('unauthorized');
        router.replace('/driver/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors du chargement');
      }
      const data = await res.json();
      setDeliveries(data.deliveries || []);
      setFetchState('loaded');
    } catch (err) {
      setFetchState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau');
    }
  }, [router]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // ─── Logout ──────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/driver/login', { method: 'DELETE' });
    } catch {
      // ignore
    }
    router.replace('/driver/login');
  }, [router]);

  // ─── Skeleton loader ─────────────────────────────────────────────────

  if (fetchState === 'loading') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        {/* Header skeleton */}
        <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-gray-800 animate-pulse" />
                <div className="h-3 w-16 rounded bg-gray-800 animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
          <div className="h-10 rounded-xl bg-gray-800 animate-pulse mb-4" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#1f2937] border border-gray-700 rounded-2xl p-5 space-y-3 mb-3 animate-pulse"
            >
              <div className="h-5 w-32 rounded bg-gray-700" />
              <div className="h-4 w-full rounded bg-gray-700" />
              <div className="h-4 w-3/4 rounded bg-gray-700" />
              <div className="h-10 w-full rounded-xl bg-gray-700" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Smarticket<span className="text-amber-400">S</span>
              </h1>
              <p className="text-[11px] text-gray-400 -mt-0.5">Chauffeur</p>
            </div>
          </div>

          {/* PWA Verified Badge */}
          {pwaGuard.verified && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20" title={"Agence vérifiée: " + pwaGuard.agencyName}>
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] font-semibold text-emerald-400 hidden sm:inline truncate max-w-[80px]">
                {pwaGuard.agencyName}
              </span>
            </div>
          )}

          {/* PWA Token Expired Warning */}
          {pwaGuard.expired && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20" title={pwaGuard.error}>
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-[10px] font-semibold text-amber-400 hidden sm:inline">Token expiré</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 text-xs font-medium transition-colors disabled:opacity-50"
            aria-label="Se déconnecter"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {/* ─── Stats bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-[#1f2937] border border-gray-700 rounded-xl px-4 py-3 flex-1 mr-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-300">
                <span className="font-bold text-amber-400">{deliveries.length}</span>{' '}
                colis à livrer
              </span>
            </div>
          </div>
          <button
            onClick={fetchDeliveries}
            disabled={false}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1f2937] border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
            aria-label="Actualiser la liste"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Error state ────────────────────────────────────────── */}
        {fetchState === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={fetchDeliveries}
              className="mt-2 text-sm text-red-300 underline underline-offset-2 hover:text-red-200"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ─── Empty state ────────────────────────────────────────── */}
        {fetchState === 'loaded' && deliveries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1f2937] border border-gray-700 flex items-center justify-center mb-4">
              <Inbox className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-1">
              Aucun colis en transit
            </h3>
            <p className="text-sm text-gray-500 max-w-[240px]">
              Aucun colis n&apos;est assigné pour le moment. Revenez plus tard.
            </p>
          </div>
        )}

        {/* ─── Delivery cards ──────────────────────────────────────── */}
        <div className="space-y-3">
          {deliveries.map((item) => (
            <Link
              key={item.id}
              href={`/driver/deliver/${item.id}`}
              className="block"
            >
              <div className="bg-[#1f2937] border border-gray-700 rounded-2xl p-4 active:scale-[0.98] transition-transform hover:border-amber-500/30">
                {/* Reference */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-amber-400 tracking-wider">
                    {item.reference}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.paymentStatus === 'SENDER_PAID'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {item.paymentStatus === 'SENDER_PAID'
                      ? 'Payé expéditeur'
                      : 'Paiement destinataire'}
                  </span>
                </div>

                {/* Route */}
                <div className="flex items-start gap-2 mb-2.5">
                  <Navigation className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-200 leading-snug">
                    <span className="font-medium">{item.departureCity || '—'}</span>
                    <span className="mx-1.5 text-gray-500">→</span>
                    <span className="font-medium">{item.destination || '—'}</span>
                  </div>
                </div>

                {/* Receiver */}
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300 truncate">
                    {item.receiverName || 'Destinataire non renseigné'}
                  </span>
                </div>

                {/* Pickup address */}
                {item.pickupAddress && (
                  <div className="flex items-start gap-2 mb-2.5 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-400 line-clamp-1">
                      {item.pickupAddress}
                    </span>
                  </div>
                )}

                {/* Bottom row: Type, Weight, Time */}
                <div className="flex items-center gap-3 pt-2.5 border-t border-gray-700/50">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-300">
                    {getColisTypeLabel(item.colisType, item.colisTypeOther)}
                  </span>
                  {item.colisWeight != null && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Weight className="w-3 h-3" />
                      {item.colisWeight} kg
                    </span>
                  )}
                  {item.estimatedArrival && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
                      <Clock className="w-3 h-3" />
                      {item.estimatedArrival}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1117] border-t border-gray-800 px-4 py-2.5 safe-bottom">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-[10px] text-gray-500">
            SmarticketS Chauffeur &mdash; Livraison sécurisée
          </p>
        </div>
      </footer>
    </div>
  );
}
