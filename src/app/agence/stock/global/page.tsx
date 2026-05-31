'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Luggage,
  QrCode,
  Ticket,
  Package,
  Search,
  ArrowLeft,
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { useAgency } from '@/app/agence/layout';
import { KpiCard } from '@/components/agency/kpi-card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Station {
  id: string;
  name: string;
  slug: string;
  city: string;
  isActive: boolean;
}

interface Baggage {
  id: string;
  reference: string;
  type: string;
  category: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

/* ══════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════ */
const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isToday = (dateString: string) => {
  const d = new Date(dateString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/* ══════════════════════════════════════════════
   Animation Variants
   ══════════════════════════════════════════════ */
const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};

/* ══════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════ */
export default function GlobalStockPage() {
  const { agencyId } = useAgency();

  // Data state
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      setError(null);

      const [baggagesRes, stationsRes] = await Promise.all([
        fetch(`/api/agency/baggages?agencyId=${agencyId}&stationId=null`),
        fetch(`/api/stations?agencyId=${agencyId}`),
      ]);

      if (baggagesRes.ok) {
        const data = await baggagesRes.json();
        setBaggages(data.baggages || []);
      } else {
        const err = await baggagesRes.json().catch(() => ({}));
        setError(err.error || 'Erreur lors du chargement du stock');
      }

      if (stationsRes.ok) {
        const data = await stationsRes.json();
        setStations(data.stations || []);
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

  /* ── Filtered baggages ── */
  const filteredBaggages = useMemo(() => {
    if (!search.trim()) return baggages;
    const q = search.toLowerCase();
    return baggages.filter(
      (b) =>
        b.reference.toLowerCase().includes(q) ||
        (b.travelerFirstName && b.travelerFirstName.toLowerCase().includes(q)) ||
        (b.travelerLastName && b.travelerLastName.toLowerCase().includes(q))
    );
  }, [baggages, search]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const todayBaggages = baggages.filter((b) => isToday(b.createdAt));
    return {
      total: baggages.length,
      tickets: baggages.filter((b) => b.category === 'ticket').length,
      parcels: baggages.filter((b) => b.category === 'parcel').length,
      today: todayBaggages.length,
    };
  }, [baggages]);

  /* ── Selection ── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBaggages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBaggages.map((b) => b.id)));
    }
  };

  /* ── Assign to Station ── */
  const handleAssign = async () => {
    if (!selectedStationId || selectedIds.size === 0) return;

    setAssignLoading(true);
    try {
      const res = await fetch('/api/agency/baggages/assign-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baggageIds: Array.from(selectedIds),
          stationId: selectedStationId,
          agencyId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `${data.assignedCount || selectedIds.size} QR code(s) assigné(s) avec succès`
        );
        setShowAssignDialog(false);
        setSelectedStationId('');
        setSelectedIds(new Set());
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de l'assignation");
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setAssignLoading(false);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Luggage className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Stock Global
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              QR codes non assignés à une gare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/agence/gares">
              <ArrowLeft className="w-4 h-4" />
              Gares
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Rafraîchir'
            )}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowAssignDialog(true)}
              className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white shadow-lg shadow-[#FF1D8D]/20"
              size="sm"
            >
              <Building2 className="w-4 h-4" />
              Assigner à une gare ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            title="Total Stock"
            value={kpis.total}
            icon={<QrCode className="w-5 h-5" />}
            description="QR non assignés"
          />
          <KpiCard
            title="Tickets"
            value={kpis.tickets}
            icon={<Ticket className="w-5 h-5" />}
            description="en stock"
          />
          <KpiCard
            title="Colis"
            value={kpis.parcels}
            icon={<Package className="w-5 h-5" />}
            description="en stock"
          />
          <KpiCard
            title="Aujourd'hui"
            value={kpis.today}
            icon={<Calendar className="w-5 h-5" />}
            description="ajoutés ce jour"
          />
        </motion.div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Search Bar */}
      {!loading && baggages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Rechercher par référence ou voyageur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="py-0 gap-0 overflow-hidden">
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && baggages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-6">
            <Luggage className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            Stock global vide
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Tous vos QR codes sont déjà assignés à des gares. Générez de
            nouveaux QR codes pour alimenter votre stock.
          </p>
        </motion.div>
      )}

      {/* No search results */}
      {!loading && baggages.length > 0 && filteredBaggages.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun QR code ne correspond à votre recherche
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredBaggages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="py-0 gap-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredBaggages.length > 0 &&
                          selectedIds.size === filteredBaggages.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Référence
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      Statut
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                      Créé le
                    </TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredBaggages.map((b, idx) => (
                      <motion.tr
                        key={b.id}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                        className={`border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          selectedIds.has(b.id)
                            ? 'bg-[#FF1D8D]/5 dark:bg-[#FF1D8D]/10'
                            : ''
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(b.id)}
                            onCheckedChange={() => toggleSelect(b.id)}
                            aria-label={`Sélectionner ${b.reference}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                              <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                                {b.reference}
                              </span>
                              {b.travelerFirstName && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {b.travelerFirstName} {b.travelerLastName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium"
                          >
                            {b.category === 'ticket'
                              ? 'Ticket'
                              : b.category === 'parcel'
                              ? 'Colis'
                              : b.category || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                            En attente
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(b.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-[#FF1D8D] hover:text-[#FF1D8D] hover:bg-[#FF1D8D]/10"
                            onClick={() => {
                              setSelectedIds(new Set([b.id]));
                              setShowAssignDialog(true);
                            }}
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1" />
                            Assigner
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filteredBaggages.length} QR code(s) en stock
                {selectedIds.size > 0 &&
                  ` · ${selectedIds.size} sélectionné(s)`}
              </p>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 hover:text-red-500"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="w-3 h-3 mr-1" />
                  Désélectionner
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Assign to Station Dialog ── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#FF1D8D]" />
              </div>
              Assigner à une gare
            </DialogTitle>
            <DialogDescription>
              {selectedIds.size} QR code(s) seront assignés à la gare
              sélectionnée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {stations.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Aucune gare disponible. Créez d&apos;abord une gare.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAssignDialog(false)}
                >
                  Fermer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="station-select"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Choisir une gare
                </label>
                <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                  <SelectTrigger className="w-full" id="station-select">
                    <SelectValue placeholder="Sélectionnez une gare..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {stations
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.name}</span>
                            <span className="text-xs text-slate-400">
                              — {s.city}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {stations.length > 0 && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={!selectedStationId || assignLoading}
                onClick={handleAssign}
                className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white"
              >
                {assignLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {assignLoading ? 'Assignation...' : 'Assigner'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
