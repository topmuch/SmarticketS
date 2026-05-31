'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  QrCode,
  Ticket,
  Package,
  CheckCircle,
  Clock,
  Luggage,
  MapPin,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Zap,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useAgency } from '@/app/agence/layout';
import { KpiCard } from '@/components/agency/kpi-card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  isPending,
  isActive,
  isInTransit,
  isDelivered,
  isLost,
  isFound,
} from '@/lib/status';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Station {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    departuresAsOrigin: number;
    departuresAsDest: number;
  };
}

interface StationStats {
  total: number;
  pending: number;
  active: number;
  inTransit: number;
  delivered: number;
  lost: number;
  found: number;
  todayActivations: number;
  byCategory: {
    parcel: number;
    ticket: number;
  };
}

interface Baggage {
  id: string;
  reference: string;
  type: string;
  category: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  whatsappOwner: string | null;
  status: string;
  transportMode: string;
  busCompany: string | null;
  airlineName: string | null;
  departureCity: string | null;
  destination: string | null;
  departureDate: string | null;
  departureTime: string | null;
  deliveryLocation: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  lastScanDate: string | null;
  lastLocation: string | null;
}

/* ══════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════ */
const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; className: string }> = {
    pending_activation: {
      label: 'En attente',
      className:
        'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    active: {
      label: 'Actif',
      className:
        'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    scanned: {
      label: 'Scanné',
      className:
        'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
    in_transit: {
      label: 'En transit',
      className:
        'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    delivered: {
      label: 'Livré',
      className:
        'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
    },
    lost: {
      label: 'Perdu',
      className:
        'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
    },
    found: {
      label: 'Retrouvé',
      className:
        'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
    },
    blocked: {
      label: 'Bloqué',
      className:
        'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
    },
  };

  const c = config[status] || {
    label: status,
    className:
      'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  return (
    <Badge variant="secondary" className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </Badge>
  );
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' à ' +
    d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
};

/* ══════════════════════════════════════════════
   Baggage Table
   ══════════════════════════════════════════════ */
function BaggageTable({ baggages, emptyMessage }: { baggages: Baggage[]; emptyMessage: string }) {
  if (baggages.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Référence</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Voyageur</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Type</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">Trajet</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">Statut</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">Créé le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baggages.map((b) => (
              <TableRow
                key={b.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20 flex items-center justify-center shrink-0">
                      <QrCode className="w-3.5 h-3.5 text-[#FF1D8D]" />
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {b.reference}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {b.travelerFirstName || b.travelerLastName ? (
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {b.travelerFirstName} {b.travelerLastName}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full">
                      Non assigné
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {b.category === 'ticket' ? 'Ticket' : b.category === 'parcel' ? 'Colis' : b.category || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {b.departureCity || '—'} → {b.destination || '—'}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(b.status)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(b.createdAt)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {baggages.length} élément(s)
        </p>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════ */
export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { agencyId } = useAgency();
  const slug = params.slug as string;

  // Data state
  const [station, setStation] = useState<Station | null>(null);
  const [stats, setStats] = useState<StationStats | null>(null);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('overview');

  /* ── Fetch Station ── */
  const fetchStation = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/stations/by-slug/${slug}?all=true`);
      if (res.ok) {
        const data = await res.json();
        setStation(data.station);
        return data.station;
      } else {
        setError('Gare introuvable');
        return null;
      }
    } catch {
      setError('Erreur réseau');
      return null;
    }
  }, [slug]);

  /* ── Fetch Stats ── */
  const fetchStats = useCallback(async (stationId: string) => {
    try {
      const res = await fetch(
        `/api/agency/stations/${stationId}/stats?agencyId=${agencyId}`
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats fetch failure is not critical
    }
  }, [agencyId]);

  /* ── Fetch Baggages by Status ── */
  const fetchBaggages = useCallback(
    async (stationId: string, status?: string) => {
      try {
        const params = new URLSearchParams({
          agencyId,
          stationId,
        });
        if (status && status !== 'all') {
          params.set('status', status);
        }

        const res = await fetch(`/api/agency/baggages?${params}`);
        if (res.ok) {
          const data = await res.json();
          setBaggages(data.baggages || []);
        }
      } catch {
        toast.error('Erreur lors du chargement des baggages');
      }
    },
    [agencyId]
  );

  /* ── Load everything ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const st = await fetchStation();
      if (!st) {
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchStats(st.id),
        fetchBaggages(st.id, 'all'),
      ]);

      setLoading(false);
    };

    load();
  }, [fetchStation, fetchStats, fetchBaggages]);

  /* ── Filter baggages by tab ── */
  const filteredBaggages = useMemo(() => {
    if (activeTab === 'overview') return baggages;
    switch (activeTab) {
      case 'pending':
        return baggages.filter((b) => isPending(b.status));
      case 'tickets':
        return baggages.filter((b) => b.category === 'ticket');
      case 'parcels':
        return baggages.filter((b) => b.category === 'parcel');
      case 'completed':
        return baggages.filter((b) => isDelivered(b.status) || isFound(b.status));
      default:
        return baggages;
    }
  }, [baggages, activeTab]);

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    if (!baggages.length) return { pending: 0, tickets: 0, parcels: 0, completed: 0 };
    return {
      pending: baggages.filter((b) => isPending(b.status)).length,
      tickets: baggages.filter((b) => b.category === 'ticket').length,
      parcels: baggages.filter((b) => b.category === 'parcel').length,
      completed: baggages.filter((b) => isDelivered(b.status) || isFound(b.status)).length,
    };
  }, [baggages]);

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/agence/gares"
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Gares
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-slate-900 dark:text-white font-medium">
              {station?.name || slug}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push('/agence/gares')}
            >
              Retour aux gares
            </Button>
          </div>
        </div>
      )}

      {/* Station Header */}
      {!loading && station && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF1D8D] flex items-center justify-center shadow-lg shadow-[#FF1D8D]/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {station.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={
                      station.isActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold uppercase'
                        : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-semibold uppercase'
                    }
                  >
                    {station.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {station.city}
                    {station.address ? ` — ${station.address}` : ''}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/agence/gares')}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </div>
        </motion.div>
      )}

      {/* KPI Cards — Overview Tab */}
      {!loading && station && stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            title="QR Assignés"
            value={stats.total}
            icon={<QrCode className="w-5 h-5" />}
            description="QR codes dans cette gare"
          />
          <KpiCard
            title="Tickets"
            value={stats.byCategory?.ticket || 0}
            icon={<Ticket className="w-5 h-5" />}
            description={`${stats.inTransit || 0} en transit`}
          />
          <KpiCard
            title="Colis"
            value={stats.byCategory?.parcel || 0}
            icon={<Package className="w-5 h-5" />}
            description={`${stats.inTransit || 0} en transit`}
          />
          <KpiCard
            title="Activations Auj."
            value={stats.todayActivations || 0}
            icon={<Zap className="w-5 h-5" />}
            description="aujourd'hui"
          />
        </motion.div>
      )}

      {/* Tabs */}
      {!loading && station && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 h-auto flex-wrap gap-1">
              <TabsTrigger
                value="overview"
                className="text-xs px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-lg"
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Vue d&apos;ensemble
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="text-xs px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-lg"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                QR Non Activés
                {tabCounts.pending > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {tabCounts.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="text-xs px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-lg"
              >
                <Ticket className="w-3.5 h-3.5 mr-1.5" />
                Tickets
                {tabCounts.tickets > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-[#FF1D8D]/10 text-[#FF1D8D] dark:bg-[#FF1D8D]/20">
                    {tabCounts.tickets}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="parcels"
                className="text-xs px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-lg"
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                Colis
                {tabCounts.parcels > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {tabCounts.parcels}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs px-3 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm rounded-lg"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Terminés
                {tabCounts.completed > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {tabCounts.completed}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                {/* Activity Summary */}
                <Card className="py-0 gap-0">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#FF1D8D]" />
                      Résumé d&apos;activité
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {stats?.pending || 0}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          En attente
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {stats?.inTransit || 0}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          En transit
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {stats?.delivered || 0}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          Livrés
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                          {stats?.lost || 0}
                        </p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          Perdus
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity Table */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Tous les baggages de la gare
                  </h3>
                  <BaggageTable
                    baggages={baggages.slice(0, 20)}
                    emptyMessage="Aucun baggage assigné à cette gare"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending">
              <BaggageTable
                baggages={filteredBaggages}
                emptyMessage="Aucun QR en attente d'activation dans cette gare"
              />
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <BaggageTable
                baggages={filteredBaggages}
                emptyMessage="Aucun ticket dans cette gare"
              />
            </TabsContent>

            {/* Parcels Tab */}
            <TabsContent value="parcels">
              <BaggageTable
                baggages={filteredBaggages}
                emptyMessage="Aucun colis dans cette gare"
              />
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed">
              <BaggageTable
                baggages={filteredBaggages}
                emptyMessage="Aucun baggage terminé dans cette gare"
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
