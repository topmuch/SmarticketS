'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  ExternalLink,
  Copy,
  CheckCircle,
  MapPin,
  Building2,
  RefreshCw,
  Loader2,
  QrCode,
  Maximize,
  Clock,
  AlertTriangle,
  Radio,
  Eye,
} from 'lucide-react';
import { useAgency } from '../layout';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Station {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  slug: string;
  isActive: boolean;
  agencyId: string;
  _count?: {
    departuresAsOrigin: number;
    departuresAsDest: number;
  };
  createdAt: string;
}

/* ══════════════════════════════════════════════
   Station Display Card
   ══════════════════════════════════════════════ */
function StationDisplayCard({
  station,
}: {
  station: Station;
}) {
  const publicUrl = `/signage-slug/${station.slug}`;
  const kioskUrl = `/signage-slug/${station.slug}?kiosk=1`;
  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${publicUrl}`
      : publicUrl;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('URL copiée dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier l'URL");
    }
  };

  const departuresCount =
    (station._count?.departuresAsOrigin ?? 0) +
    (station._count?.departuresAsDest ?? 0);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg ${
        station.isActive
          ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
          : 'border-slate-200 dark:border-slate-800 opacity-60'
      }`}
    >
      {/* Top gradient bar */}
      <div
        className={`h-1.5 ${
          station.isActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
            : 'bg-gradient-to-r from-slate-300 to-slate-400'
        }`}
      />

      <div className="p-5">
        {/* Header: Station name + status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                station.isActive
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <Building2
                className={`w-6 h-6 ${
                  station.isActive
                    ? 'text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {station.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {station.city}
                  {station.address ? ` — ${station.address}` : ''}
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant={station.isActive ? 'default' : 'secondary'}
            className={
              station.isActive
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }
          >
            {station.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Preview iframe */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4 bg-[#0b0f19]">
          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 hover:opacity-100 transition-opacity bg-black/50">
            <Button
              onClick={() => window.open(kioskUrl, '_blank')}
              className="bg-[#FF1D8D] hover:bg-[#e0187d] text-white rounded-xl px-4 py-2.5 gap-2 font-semibold shadow-lg"
            >
              <Maximize className="w-4 h-4" />
              Ouvrir plein écran
            </Button>
          </div>
          <iframe
            src={publicUrl}
            className="w-full h-48 pointer-events-none"
            title={`Aperçu: ${station.name}`}
            loading="lazy"
            sandbox="allow-scripts"
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {station._count?.departuresAsOrigin ?? 0}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Départs
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {station._count?.departuresAsDest ?? 0}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Arrivées
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {departuresCount}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Total
            </p>
          </div>
        </div>

        {/* URL + QR Code row */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="shrink-0 p-1.5 bg-white dark:bg-slate-700 rounded-lg">
            <QRCodeSVG
              value={fullUrl}
              size={48}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0f172a"
              includeMargin={false}
            />
          </div>
          <div className="flex-1 min-w-0">
            <code className="text-[11px] text-slate-600 dark:text-slate-400 font-mono block truncate">
              {publicUrl}
            </code>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-emerald-600"
              onClick={handleCopy}
              title="Copier l'URL"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-blue-600"
              onClick={() => window.open(publicUrl, '_blank')}
              title="Ouvrir l'affichage"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => window.open(kioskUrl, '_blank')}
            className="flex-1 bg-[#FF1D8D] hover:bg-[#e0187d] text-white rounded-xl gap-2 font-semibold shadow-lg shadow-pink-500/20"
          >
            <Monitor className="w-4 h-4" />
            Lancer Kiosk
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2 font-semibold"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            <Eye className="w-4 h-4" />
            Voir affichage
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Page — Affichage Gare
   ══════════════════════════════════════════════ */
export default function AffichageGarePage() {
  const { agencyId } = useAgency();

  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  /* ── Fetch Stations with departure counts ── */
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setStations(
          (data.stations || []).map(
            (s: Station & { _count?: { departures: number } }) => ({
              ...s,
              _count: {
                departuresAsOrigin: s._count?.departures ?? 0,
                departuresAsDest: 0,
              },
            })
          )
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Erreur lors du chargement des gares');
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Auto-refresh every 30s when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStations, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStations]);

  const activeStations = stations.filter((s) => s.isActive);
  const inactiveStations = stations.filter((s) => !s.isActive);

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF1D8D] to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            Affichage Gare
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos écrans d&apos;affichage public pour chaque gare
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={
              autoRefresh
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5'
                : 'gap-1.5'
            }
          >
            <Radio className="w-4 h-4" />
            {autoRefresh ? 'Live' : 'Auto'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStations}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Rafraîchir
          </Button>
          <Button
            onClick={() => window.open('/agence/gares', '_self')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2"
          >
            <Building2 className="w-4 h-4" />
            Gérer les gares
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {stations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Total gares
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stations.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              Actives
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeStations.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Inactives
            </p>
            <p className="text-2xl font-extrabold text-slate-400 mt-0.5">
              {inactiveStations.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-[#FF1D8D] font-semibold uppercase tracking-wider">
              Total départs liés
            </p>
            <p className="text-2xl font-extrabold text-[#FF1D8D] mt-0.5">
              {stations.reduce(
                (acc, s) =>
                  acc +
                  ((s._count?.departuresAsOrigin ?? 0) +
                    (s._count?.departuresAsDest ?? 0)),
                0
              )}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Erreur de chargement
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {error}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStations}>
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <Skeleton className="h-1.5 w-full" />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && stations.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-5">
            <Monitor className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            Aucune gare configurée
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 max-w-md mx-auto">
            Vous devez d&apos;abord créer des gares pour pouvoir afficher les
            départs sur un écran public.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 max-w-sm mx-auto">
            Chaque gare dispose de son propre écran d&apos;affichage temps réel
            avec QR code et URL publique unique.
          </p>
          <Button
            onClick={() => window.open('/agence/gares', '_self')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Building2 className="w-4 h-4" />
            Créer une gare
          </Button>
        </div>
      )}

      {/* Active Stations Grid */}
      {!loading && activeStations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Gares actives ({activeStations.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeStations.map((station) => (
              <StationDisplayCard key={station.id} station={station} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Stations */}
      {!loading && inactiveStations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Gares inactives ({inactiveStations.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {inactiveStations.map((station) => (
              <StationDisplayCard key={station.id} station={station} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
