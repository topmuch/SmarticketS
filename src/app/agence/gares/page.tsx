'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Luggage,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { useAgency } from '@/app/agence/layout';
import { StationCard } from '@/components/agency/station-card';
import { KpiCard } from '@/components/agency/kpi-card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

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
}

interface StationStats {
  [stationId: string]: {
    total: number;
    pending: number;
    active: number;
    todayActivations: number;
  };
}

interface AllStatsData {
  totalStations: number;
  activeStations: number;
  totalBaggages: number;
  todayActivations: number;
}

interface StationFormData {
  name: string;
  city: string;
  address: string;
}

const emptyForm: StationFormData = {
  name: '',
  city: '',
  address: '',
};

/* ══════════════════════════════════════════════
   Animation Variants
   ══════════════════════════════════════════════ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

/* ══════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════ */
export default function GaresPage() {
  const { agencyId } = useAgency();
  const router = useRouter();

  // Data state
  const [stations, setStations] = useState<Station[]>([]);
  const [stationStats, setStationStats] = useState<StationStats>({});
  const [allStats, setAllStats] = useState<AllStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<StationFormData>(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  /* ── Fetch Stations & Stats ── */
  const fetchData = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      setError(null);

      const [stationsRes, statsRes] = await Promise.all([
        fetch(`/api/stations?agencyId=${agencyId}`),
        fetch(`/api/agency/stations/all-stats?agencyId=${agencyId}`),
      ]);

      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData.stations || []);
      } else {
        const err = await stationsRes.json().catch(() => ({}));
        setError(err.error || 'Erreur lors du chargement des gares');
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStationStats(statsData.stations || {});
        setAllStats(statsData.allStats || null);
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filter Stations ── */
  const filteredStations = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [stations, search]);

  /* ── Create Station ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.city.trim() || !agencyId) return;

    setCreateLoading(true);
    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          city: createForm.city.trim(),
          address: createForm.address.trim() || undefined,
          agencyId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Gare "${data.station.name}" créée avec succès`);
        setShowCreateDialog(false);
        setCreateForm(emptyForm);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF1D8D] flex items-center justify-center shadow-lg shadow-[#FF1D8D]/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Gares
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos gares et suivez l&apos;activité QR par gare
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Rafraîchir
          </Button>
          <Link href="/agence/stock/global">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <Luggage className="w-4 h-4" />
              Stock Global
            </Button>
          </Link>
          <Button
            onClick={() => {
              setCreateForm(emptyForm);
              setShowCreateDialog(true);
            }}
            className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white shadow-lg shadow-[#FF1D8D]/20"
          >
            <Plus className="w-4 h-4" />
            Créer une gare
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {allStats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            title="Total Gares"
            value={allStats.totalStations}
            icon={<Building2 className="w-5 h-5" />}
            description={`${allStats.activeStations} actives`}
          />
          <KpiCard
            title="QR Assignés"
            value={allStats.totalBaggages}
            icon={<Luggage className="w-5 h-5" />}
            description="toutes gares confondues"
          />
          <KpiCard
            title="QR Disponibles"
            value="—"
            icon={<Search className="w-5 h-5" />}
            description="non activés par gare"
          />
          <KpiCard
            title="Activations Auj."
            value={allStats.todayActivations}
            icon={<MapPin className="w-5 h-5" />}
            description="aujourd'hui"
          />
        </motion.div>
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
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Search Bar */}
      {!loading && stations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, ville ou adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="py-0 gap-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-14 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-9 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && stations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-[#FF1D8D]" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            Aucune gare créée
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Créez votre première gare pour commencer à organiser vos QR codes
            et suivre l&apos;activité par point de départ.
          </p>
          <Button
            onClick={() => {
              setCreateForm(emptyForm);
              setShowCreateDialog(true);
            }}
            className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white shadow-lg shadow-[#FF1D8D]/20"
          >
            <Plus className="w-4 h-4" />
            Créer une gare
          </Button>
        </motion.div>
      )}

      {/* No Search Results */}
      {!loading && !error && stations.length > 0 && filteredStations.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center"
        >
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Aucune gare ne correspond à votre recherche
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Essayez un autre terme de recherche
          </p>
        </motion.div>
      )}

      {/* Station Cards Grid */}
      <AnimatePresence mode="wait">
        {!loading && filteredStations.length > 0 && (
          <motion.div
            key="stations-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredStations.map((station) => (
              <motion.div key={station.id} variants={cardVariants}>
                <StationCard
                  station={station}
                  stats={
                    stationStats[station.id] || {
                      total: 0,
                      pending: 0,
                      active: 0,
                      todayActivations: 0,
                    }
                  }
                  onClick={() => router.push(`/agence/gares/${station.slug}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Station Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#FF1D8D]" />
              </div>
              Créer une gare
            </DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle gare à votre réseau. Elle apparaîtra dans
              votre espace et pourra recevoir des QR codes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Nom de la gare <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-name"
                placeholder="Ex: Gare de Dakar"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-city">
                Ville <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-city"
                placeholder="Ex: Dakar"
                value={createForm.city}
                onChange={(e) =>
                  setCreateForm({ ...createForm, city: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-address">Adresse</Label>
              <Input
                id="create-address"
                placeholder="Ex: Rue 10, Médina (optionnel)"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({ ...createForm, address: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white"
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Créer la gare
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
