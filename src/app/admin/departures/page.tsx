'use client';

import AdminLayout from '@/components/admin/NewAdminLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { io, Socket } from 'socket.io-client';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlaneTakeoff,
  Timer,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────
interface RouteOption {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

interface Departure {
  id: string;
  routeId: string | null;
  departureType: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  availableSeats: number;
  totalSeats: number;
  status: string;
  delayMinutes: number;
  agencyId: string;
  route?: {
    id: string;
    name: string;
    origin: string;
    destination: string;
  } | null;
  createdAt: string;
}

interface DepartureFormData {
  routeId: string;
  departureType: string;
  lineNumber: string;
  destination: string;
  date: string;
  time: string;
  platform: string;
  totalSeats: string;
  availableSeats: string;
  originStationId: string;
  destinationStationId: string;
}

const emptyDepartureForm: DepartureFormData = {
  routeId: '',
  departureType: 'OUTBOUND',
  lineNumber: '',
  destination: '',
  date: '',
  time: '',
  platform: '',
  totalSeats: '45',
  availableSeats: '45',
  originStationId: '',
  destinationStationId: '',
};

// ── Helpers ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: {
    label: 'Planifié',
    color: 'bg-sky-100 text-sky-700',
    icon: <Clock className="w-3 h-3" />,
  },
  BOARDING: {
    label: 'Embarquement',
    color: 'bg-emerald-100 text-emerald-700',
    icon: <Play className="w-3 h-3" />,
  },
  DEPARTED: {
    label: 'Parti',
    color: 'bg-slate-100 text-slate-600',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
  DELAYED: {
    label: 'Retardé',
    color: 'bg-amber-100 text-amber-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  IMMINENT: {
    label: 'Imminent',
    color: 'bg-red-100 text-red-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  RESOLUTION_RETARD: {
    label: 'Retard Résolu',
    color: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// ── Component ──────────────────────────────────────────────
export default function DeparturesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [stations, setStations] = useState<{id: string; name: string; city: string; slug: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState(today());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<Departure | null>(null);
  const [form, setForm] = useState<DepartureFormData>(emptyDepartureForm);

  // CSV import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Retard modal
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [delayDeparture, setDelayDeparture] = useState<Departure | null>(null);
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delaySaving, setDelaySaving] = useState(false);

  // WebSocket for real-time kiosk broadcast
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch session ───────────────────────────────────────
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user?.agencyId) {
          setAgencyId(data.user.agencyId);
        }
      } catch {
        toast.error('Erreur lors du chargement de la session');
      }
    };
    fetchSession();
  }, []);

  // ── Fetch routes (for select) ──────────────────────────
  const fetchRoutes = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(`/api/admin/routes?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || data || []);
      }
    } catch {
      // Silently fail – routes select will just be empty
    }
  }, [agencyId]);

  // ── Fetch stations ──────────────────────────────────────
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setStations(data || []);
      }
    } catch { /* silent */ }
  }, [agencyId]);

  // ── Fetch departures ───────────────────────────────────
  const fetchDepartures = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ agencyId, date: filterDate });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const res = await fetch(`/api/admin/departures?${params}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setDepartures(data.departures || data || []);
    } catch {
      toast.error('Erreur lors du chargement des horaires');
    } finally {
      setLoading(false);
    }
  }, [agencyId, filterDate, filterStatus]);

  useEffect(() => {
    if (agencyId) {
      fetchRoutes();
      fetchStations();
      fetchDepartures();
    }
  }, [agencyId, fetchRoutes, fetchStations, fetchDepartures]);

  // ── Auto-fill destination from route ────────────────────
  const handleRouteSelect = (routeId: string) => {
    setForm((prev) => ({ ...prev, routeId }));
    const selected = routes.find((r) => r.id === routeId);
    if (selected && !editingDeparture) {
      setForm((prev) => ({
        ...prev,
        destination: prev.departureType === 'RETURN' ? selected.origin : selected.destination,
      }));
    }
  };

  // ── Update departure type → auto-fill destination ──────
  const handleTypeChange = (type: string) => {
    setForm((prev) => {
      const next = { ...prev, departureType: type };
      const selected = routes.find((r) => r.id === prev.routeId);
      if (selected) {
        next.destination = type === 'RETURN' ? selected.origin : selected.destination;
      }
      return next;
    });
  };

  // ── Open create ─────────────────────────────────────────
  const openCreate = () => {
    setEditingDeparture(null);
    setForm({ ...emptyDepartureForm, date: today() });
    setDialogOpen(true);
  };

  // ── Open edit ──────────────────────────────────────────
  const openEdit = (dep: Departure) => {
    setEditingDeparture(dep);
    const scheduled = new Date(dep.scheduledTime);
    setForm({
      routeId: dep.routeId || '',
      departureType: dep.departureType,
      lineNumber: dep.lineNumber,
      destination: dep.destination,
      date: scheduled.toISOString().split('T')[0],
      time: scheduled.toTimeString().slice(0, 5),
      platform: dep.platform || '',
      totalSeats: dep.totalSeats.toString(),
      availableSeats: dep.availableSeats.toString(),
      originStationId: '',
      destinationStationId: '',
    });
    setDialogOpen(true);
  };

  // ── Save ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.lineNumber || !form.destination || !form.date || !form.time) {
      toast.error('Numéro de ligne, destination, date et heure sont obligatoires');
      return;
    }
    if (!agencyId) {
      toast.error('Session non chargée, veuillez réessayer');
      return;
    }

    setSaving(true);
    try {
      const scheduledTime = new Date(`${form.date}T${form.time}:00`).toISOString();

      const payload = {
        routeId: form.routeId || null,
        departureType: form.departureType,
        lineNumber: form.lineNumber,
        destination: form.destination,
        scheduledTime,
        platform: form.platform || null,
        totalSeats: parseInt(form.totalSeats, 10) || 45,
        availableSeats: parseInt(form.availableSeats, 10) || 0,
        agencyId,
        originStationId: form.originStationId || null,
        destinationStationId: form.destinationStationId || null,
      };

      const url = editingDeparture
        ? `/api/admin/departures?id=${editingDeparture.id}`
        : '/api/admin/departures';
      const method = editingDeparture ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'enregistrement");
      }

      toast.success(editingDeparture ? 'Départ modifié avec succès' : 'Départ créé avec succès');
      setDialogOpen(false);
      fetchDepartures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/departures?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression');
      }
      toast.success('Départ supprimé avec succès');
      fetchDepartures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  // ── WebSocket connection to kiosk-service (port 3004) ──
  useEffect(() => {
    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;
    socket.on('connect', () => {
      // connected to kiosk-service
    });
    socket.on('disconnect', () => {
      // disconnected from kiosk-service
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Mark as DEPARTED ───────────────────────────────────
  const handleMarkDeparted = async (dep: Departure) => {
    try {
      const res = await fetch(`/api/admin/departures?id=${dep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DEPARTED' }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success('Départ marqué comme parti');
      fetchDepartures();

      // Broadcast to kiosk via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:departed', {
          stationSlug: '', // Broadcast to all stations
          departureId: dep.id,
          destination: dep.destination,
        });
      }
    } catch {
      toast.error("Erreur lors du changement de statut");
    }
  };

  // ── Mark as CANCELLED ──────────────────────────────
  const handleMarkCancelled = async (dep: Departure) => {
    try {
      const res = await fetch(`/api/admin/departures?id=${dep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success(`Départ vers ${dep.destination} marqué comme annulé`);
      fetchDepartures();

      // Broadcast to kiosk via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:cancelled', {
          stationSlug: '', // Broadcast to all stations
          departureId: dep.id,
          destination: dep.destination,
        });
      }
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  // ── Open Retard modal ────────────────────────────────
  const openDelayModal = (dep: Departure) => {
    setDelayDeparture(dep);
    setDelayMinutes(dep.delayMinutes?.toString() || '15');
    setDelayDialogOpen(true);
  };

  // ── Handle Retard (Delay) submit ─────────────────────
  const handleDelaySubmit = async () => {
    if (!delayDeparture) return;
    const minutes = parseInt(delayMinutes, 10);
    if (isNaN(minutes) || minutes < 1) {
      toast.error('Veuillez entrer un nombre de minutes valide (min 1)');
      return;
    }

    setDelaySaving(true);
    try {
      const res = await fetch(`/api/admin/departures?id=${delayDeparture.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayMinutes: minutes, status: 'DELAYED' }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success(`Retard de ${minutes} min appliqué pour ${delayDeparture.destination}`);
      setDelayDialogOpen(false);
      fetchDepartures();

      // Broadcast to kiosk via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:delay', {
          stationSlug: '', // Broadcast to all
          departureId: delayDeparture.id,
          minutes,
          destination: delayDeparture.destination,
        });
      }
    } catch {
      toast.error('Erreur lors de l\'application du retard');
    } finally {
      setDelaySaving(false);
    }
  };

  // ── Mark as Résolution Retard ─────────────────────────
  const handleResolutionDelay = async (dep: Departure) => {
    try {
      const res = await fetch(`/api/admin/departures?id=${dep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLUTION_RETARD', delayMinutes: 0 }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success(`Retard résolu pour ${dep.destination} — le bus va partir`);
      fetchDepartures();

      // Broadcast to kiosk via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:resolutionDelay', {
          stationSlug: '',
          departureId: dep.id,
          destination: dep.destination,
        });
      }
    } catch {
      toast.error("Erreur lors de la résolution du retard");
    }
  };

  // ── CSV import ─────────────────────────────────────────
  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Veuillez sélectionner un fichier CSV');
      return;
    }
    if (!agencyId) {
      toast.error('Session non chargée');
      return;
    }

    setCsvUploading(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('agencyId', agencyId);

      const res = await fetch('/api/admin/departures', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'import CSV');
      }

      const data = await res.json();
      const count = data.imported ?? data.count ?? 0;
      setCsvResult(`${count} horaire(s) importé(s) avec succès`);
      toast.success(`Import réussi : ${count} horaire(s)`);
      fetchDepartures();
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'import CSV');
    } finally {
      setCsvUploading(false);
    }
  };

  // ── Fill rate ───────────────────────────────────────────
  const fillRate = (available: number, total: number) => {
    if (total === 0) return 0;
    return Math.round(((total - available) / total) * 100);
  };

  const fillColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // ── CSV drop handlers ──────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
    } else {
      toast.error('Veuillez déposer un fichier .csv');
    }
  };

  // ── Loading skeleton ───────────────────────────────────
  if (loading && !agencyId) {
    return (
      <AdminLayout title="Gestion des Horaires" subtitle="Planifiez et gérez les départs de transport">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestion des Horaires" subtitle="Planifiez et gérez les départs de transport">
      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs defaultValue="horaires" className="w-full">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="horaires">
              <Clock className="w-4 h-4 mr-1.5" />
              Horaires
            </TabsTrigger>
            <TabsTrigger value="csv">
              <Upload className="w-4 h-4 mr-1.5" />
              Import CSV
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Horaires ─────────────────────────── */}
          <TabsContent value="horaires" className="space-y-4 mt-4">
            {/* Filters + Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="filter-date" className="text-sm whitespace-nowrap text-slate-600">Date :</Label>
                  <Input
                    id="filter-date"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                    <SelectItem value="SCHEDULED">Planifié</SelectItem>
                    <SelectItem value="BOARDING">Embarquement</SelectItem>
                    <SelectItem value="DEPARTED">Parti</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                    <SelectItem value="DELAYED">Retardé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchDepartures} className="rounded-xl">
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Button size="sm" onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nouveau Départ
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="rounded-xl border bg-white overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : departures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border">
                <PlaneTakeoff className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Aucun horaire trouvé</p>
                <p className="text-sm text-slate-400 mt-1">
                  {filterDate === today()
                    ? 'Aucun départ prévu pour aujourd\'hui'
                    : `Aucun départ le ${new Date(filterDate).toLocaleDateString('fr-FR')}`}
                </p>
                <Button
                  size="sm"
                  onClick={openCreate}
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Ajouter un départ
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="font-semibold text-slate-600">Ligne</TableHead>
                        <TableHead className="font-semibold text-slate-600">Destination</TableHead>
                        <TableHead className="font-semibold text-slate-600">Type</TableHead>
                        <TableHead className="font-semibold text-slate-600">Date / Heure</TableHead>
                        <TableHead className="font-semibold text-slate-600">Quai</TableHead>
                        <TableHead className="font-semibold text-slate-600">Places</TableHead>
                        <TableHead className="font-semibold text-slate-600">Remplissage</TableHead>
                        <TableHead className="font-semibold text-slate-600">Statut</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departures.map((dep) => {
                        const rate = fillRate(dep.availableSeats, dep.totalSeats);
                        const sc = STATUS_CONFIG[dep.status] || STATUS_CONFIG.SCHEDULED;
                        const scheduledDate = new Date(dep.scheduledTime);

                        return (
                          <TableRow key={dep.id} className="group">
                            <TableCell className="font-medium text-slate-800">{dep.lineNumber}</TableCell>
                            <TableCell className="text-slate-600">{dep.destination}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  dep.departureType === 'RETURN'
                                    ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
                                    : 'bg-sky-100 text-sky-700 hover:bg-sky-100'
                                }
                              >
                                {dep.departureType === 'RETURN' ? 'RETOUR' : 'ALLER'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600 text-sm">
                              <div className="flex flex-col">
                                <span>{scheduledDate.toLocaleDateString('fr-FR')}</span>
                                <span className="text-slate-400">
                                  {scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">{dep.platform || '—'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">
                              <span className={dep.availableSeats === 0 ? 'text-red-600 font-semibold' : ''}>
                                {dep.availableSeats}
                              </span>
                              <span className="text-slate-400"> / {dep.totalSeats}</span>
                            </TableCell>
                            <TableCell className="w-28">
                              <div className="flex flex-col gap-1">
                                <Progress
                                  value={rate}
                                  className={`h-2 ${rate >= 90 ? '[&>[data-slot=progress-indicator]]:bg-red-500' : rate >= 70 ? '[&>[data-slot=progress-indicator]]:bg-amber-500' : '[&>[data-slot=progress-indicator]]:bg-emerald-500'}`}
                                />
                                <span className={`text-xs font-medium ${fillColor(rate)}`}>{rate}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${sc.color} hover:${sc.color}`}>
                                {sc.icon}
                                <span className="ml-1">{sc.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(dep)}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {dep.status !== 'DEPARTED' && dep.status !== 'CANCELLED' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDelayModal(dep)}
                                      className="h-8 px-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg"
                                      title="Appliquer un retard"
                                    >
                                      <Timer className="w-3.5 h-3.5 mr-1" />
                                      Retard
                                    </Button>
                                    {dep.status === 'DELAYED' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleResolutionDelay(dep)}
                                        className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg"
                                        title="Résoudre le retard"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Résolu
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkDeparted(dep)}
                                      className="h-8 px-2 text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg"
                                      title="Marquer comme parti"
                                    >
                                      <Send className="w-3.5 h-3.5 mr-1" />
                                      Parti
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkCancelled(dep)}
                                      className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                      title="Marquer comme annulé"
                                    >
                                      <XCircle className="w-3.5 h-3.5 mr-1" />
                                      Annulé
                                    </Button>
                                  </>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer ce départ ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Cette action est irréversible. Le départ ligne &laquo;&nbsp;{dep.lineNumber}&nbsp;&raquo; vers {dep.destination} sera supprimé.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(dep.id)}
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Departure count */}
            {!loading && departures.length > 0 && (
              <div className="text-sm text-slate-500">
                {departures.length} horaire(s) affiché(s)
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: Import CSV ──────────────────────── */}
          <TabsContent value="csv" className="mt-4 space-y-6">
            <div className="bg-white rounded-xl border p-6 space-y-6">
              {/* Upload area */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">Importer des horaires (CSV)</h3>
                <p className="text-sm text-slate-500">
                  Importez vos horaires en masse à partir d&apos;un fichier CSV.
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-emerald-400 bg-emerald-50'
                    : csvFile
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsvFile(file);
                  }}
                />
                <Upload className={`w-10 h-10 mb-3 ${csvFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                {csvFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-emerald-700">{csvFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(csvFile.size / 1024).toFixed(1)} Ko — Cliquez pour changer
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-600">
                      Glissez votre fichier CSV ici ou <span className="text-emerald-600 font-medium">cliquez pour parcourir</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Fichier .csv uniquement</p>
                  </div>
                )}
              </div>

              {/* Template info */}
              <div className="rounded-lg bg-slate-50 border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Format du fichier CSV</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Colonnes requises :{' '}
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                    route_id, departure_type, line_number, destination, date(YYYY-MM-DD), time(HH:mm), platform, total_seats, available_seats
                  </code>
                </p>
                <div className="text-xs text-slate-400">
                  <strong>Exemple :</strong>
                  <code className="block mt-1 bg-white border rounded px-2 py-1.5 font-mono text-[11px] whitespace-pre">
                    {`route_id,departure_type,line_number,destination,date,time,platform,total_seats,available_seats
clj123abc,OUTBOUND,Ligne 1,Mbour,2025-01-15,08:30,Quai A,45,42
clj123abc,RETURN,Ligne 1,Dakar,2025-01-15,16:00,Quai B,45,45`}
                  </code>
                </div>
              </div>

              {/* Import button & result */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  {csvResult && (
                    <p className="text-sm text-emerald-600 font-medium">{csvResult}</p>
                  )}
                </div>
                <Button
                  onClick={handleCsvUpload}
                  disabled={!csvFile || csvUploading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  {csvUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Importer le CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Retard (Delay) Dialog */}
        <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                Appliquer un retard
              </DialogTitle>
              <DialogDescription>
                Définir le nombre de minutes de retard pour le départ vers{' '}
                <strong className="text-slate-900">{delayDeparture?.destination}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm">
                  <span className="text-slate-500">Ligne :</span>{' '}
                  <span className="font-medium text-slate-800">{delayDeparture?.lineNumber}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">Heure prévue :</span>{' '}
                  <span className="font-medium text-slate-800">
                    {delayDeparture ? new Date(delayDeparture.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
              {delayDeparture && delayDeparture.delayMinutes > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Un retard de {delayDeparture.delayMinutes} min est déjà appliqué.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="delay-minutes">Minutes de retard *</Label>
                <Input
                  id="delay-minutes"
                  type="number"
                  min="1"
                  max="480"
                  placeholder="15"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                  className="text-lg text-center"
                />
                <p className="text-xs text-slate-400">Entrez un nombre entre 1 et 480 minutes (8h max)</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDelayDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button
                onClick={handleDelaySubmit}
                disabled={delaySaving || !delayMinutes}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
              >
                {delaySaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Application...
                  </>
                ) : (
                  <>
                    <Timer className="w-4 h-4 mr-1.5" />
                    Appliquer {delayMinutes ? `${delayMinutes} min` : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDeparture ? 'Modifier le départ' : 'Nouveau départ'}</DialogTitle>
              <DialogDescription>
                {editingDeparture
                  ? 'Modifiez les informations du départ.'
                  : 'Remplissez les informations pour planifier un nouveau départ.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Route select */}
              <div className="space-y-2">
                <Label htmlFor="dep-route">Trajet</Label>
                <Select value={form.routeId} onValueChange={handleRouteSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un trajet (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Aucun trajet disponible
                      </SelectItem>
                    ) : (
                      routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Gare de départ */}
              <div className="space-y-2">
                <Label htmlFor="dep-origin-station">Gare de départ</Label>
                <Select value={form.originStationId} onValueChange={(v) => setForm(prev => ({...prev, originStationId: v}))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gare d'arrivée */}
              <div className="space-y-2">
                <Label htmlFor="dep-dest-station">Gare d'arrivée</Label>
                <Select value={form.destinationStationId} onValueChange={(v) => setForm(prev => ({...prev, destinationStationId: v}))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type + Line number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dep-type">Type</Label>
                  <Select value={form.departureType} onValueChange={handleTypeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTBOUND">Aller</SelectItem>
                      <SelectItem value="RETURN">Retour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep-line">Numéro de ligne *</Label>
                  <Input
                    id="dep-line"
                    placeholder="Ex: Ligne 1"
                    value={form.lineNumber}
                    onChange={(e) => setForm({ ...form, lineNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="dep-destination">Destination *</Label>
                <Input
                  id="dep-destination"
                  placeholder="Ex: Mbour"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
                <p className="text-xs text-slate-400">Auto-rempli si un trajet est sélectionné</p>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dep-date">Date *</Label>
                  <Input
                    id="dep-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep-time">Heure *</Label>
                  <Input
                    id="dep-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="dep-platform">Quai</Label>
                <Input
                  id="dep-platform"
                  placeholder="Ex: Quai A"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                />
              </div>

              {/* Seats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dep-total-seats">Places totales</Label>
                  <Input
                    id="dep-total-seats"
                    type="number"
                    min="1"
                    placeholder="45"
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep-available-seats">Places disponibles</Label>
                  <Input
                    id="dep-available-seats"
                    type="number"
                    min="0"
                    placeholder="45"
                    value={form.availableSeats}
                    onChange={(e) => setForm({ ...form, availableSeats: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                {saving
                  ? 'Enregistrement...'
                  : editingDeparture
                  ? 'Modifier'
                  : 'Créer le départ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
