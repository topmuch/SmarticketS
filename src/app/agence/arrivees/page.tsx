'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAgency } from '../layout';
import {
  Bus,
  Plus,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  Clock,
  CalendarDays,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  AlertTriangle,
  Play,
  Ban,
  Timer,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  addToQueue,
  preloadVoices,
  playDingDong,
  speakFrench,
  AnnouncementPriority,
} from '@/lib/audioSystem';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
type ArrivalStatus = 'INCOMING' | 'ARRIVED' | 'DELAYED' | 'CANCELLED';

interface ArrivalItem {
  id: string;
  origin: string;
  lineNumber: string;
  platform: string | null;
  scheduledTime: string;
  status: ArrivalStatus;
  delayMinutes: number;
  agencyId: string;
  originStationId: string | null;
  originStationSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewArrivalForm {
  origin: string;
  date: string;
  time: string;
  line: string;
  platform: string;
  seats: number;
}

const emptyForm: NewArrivalForm = {
  origin: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  line: '',
  platform: '',
  seats: 45,
};

/* ══════════════════════════════════════════════
   Status Configuration
   ══════════════════════════════════════════════ */
const statusConfig: Record<ArrivalStatus, { label: string; color: string; bg: string }> = {
  INCOMING: { label: 'En route', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ARRIVED: { label: 'Arrivé', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  DELAYED: { label: 'Retardé', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  CANCELLED: { label: 'Annulé', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const statusIcon: Record<ArrivalStatus, typeof Clock> = {
  INCOMING: Clock,
  ARRIVED: CheckCircle,
  DELAYED: Timer,
  CANCELLED: Ban,
};

// Map arrival statuses to API departure statuses
const arrivalToApiStatus: Record<ArrivalStatus, string> = {
  INCOMING: 'SCHEDULED',
  ARRIVED: 'ARRIVED',
  DELAYED: 'DELAYED',
  CANCELLED: 'CANCELLED',
};

// Map API departure statuses to arrival statuses
const apiToArrivalStatus = (apiStatus: string): ArrivalStatus => {
  switch (apiStatus) {
    case 'ARRIVED':
      return 'ARRIVED';
    case 'DELAYED':
      return 'DELAYED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'IMMINENT_ARRIVAL':
    case 'SCHEDULED':
    default:
      return 'INCOMING';
  }
};

// Next status in the lifecycle cycle
const nextStatusMap: Record<ArrivalStatus, ArrivalStatus> = {
  INCOMING: 'ARRIVED',
  ARRIVED: 'ARRIVED', // Terminal state
  DELAYED: 'ARRIVED',
  CANCELLED: 'CANCELLED', // Terminal state
};

// Available status transitions from each state
const availableTransitions: Record<ArrivalStatus, ArrivalStatus[]> = {
  INCOMING: ['ARRIVED', 'DELAYED', 'CANCELLED'],
  ARRIVED: [],
  DELAYED: ['ARRIVED', 'CANCELLED'],
  CANCELLED: [],
};

/* ══════════════════════════════════════════════
   TTS Templates for auto-announce
   ══════════════════════════════════════════════ */
const getTtsText = (item: ArrivalItem, newStatus: ArrivalStatus): string => {
  const platform = item.platform ? ` au quai ${item.platform}` : '';
  const delay = item.delayMinutes > 0 ? ` de ${item.delayMinutes} minutes` : '';
  const time = new Date(item.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  switch (newStatus) {
    case 'INCOMING':
      return `Le bus en provenance de ${item.origin} arrivera dans environ 10 minutes${platform}. Heure prévue : ${time}.`;
    case 'ARRIVED':
      return `Le bus en provenance de ${item.origin} est arrivé${platform}. Les passagers peuvent descendre.`;
    case 'DELAYED':
      return `Information. Le bus en provenance de ${item.origin} accuse un retard estimé à ${item.delayMinutes || 15} minutes. Nous vous remercions de votre patience.`;
    case 'CANCELLED':
      return `Attention. Le bus en provenance de ${item.origin} prévu à ${time} n'arrivera pas. Les passagers sont priés de contacter le guichet pour assistance.`;
  }
};

/* ══════════════════════════════════════════════
   KPI Card Component
   ══════════════════════════════════════════════ */
function KpiCard({ label, value, icon, colorClass, bgColorClass }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgColorClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`text-2xl font-extrabold mt-0.5 ${colorClass}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColorClass} flex items-center justify-center text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   New Arrival Modal
   ══════════════════════════════════════════════ */
function NewArrivalModal({
  isOpen,
  onClose,
  onSave,
  loading,
  agencyId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewArrivalForm) => void;
  loading: boolean;
  agencyId: string;
}) {
  const [form, setForm] = useState<NewArrivalForm>(emptyForm);
  const [existingRoutes, setExistingRoutes] = useState<{ id: string; origin: string; destination: string }[]>([]);

  useEffect(() => {
    if (isOpen && agencyId) {
      fetch(`/api/admin/routes?agencyId=${agencyId}`)
        .then(r => r.json())
        .then(data => setExistingRoutes(data.routes || []))
        .catch(() => {});
    }
  }, [isOpen, agencyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.origin.trim() || !form.time) return;
    onSave(form);
  };

  const originSuggestions = existingRoutes
    .map(r => r.origin)
    .filter((v, i, a) => a.indexOf(v) === i && v.toLowerCase().includes((form.origin || '').toLowerCase()))
    .slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bus className="w-5 h-5 text-white rotate-180" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Nouvelle arrivée</h3>
                    <p className="text-white/70 text-xs">Enregistrer un bus en provenance d&apos;une autre ville</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Origin */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  🏙️ Ville d&apos;origine
                </label>
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  placeholder="Ex: Dakar"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                  required
                  list="arrival-origin-list"
                />
                <datalist id="arrival-origin-list">
                  {originSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              {/* Date / Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Date prévue</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🕐 Heure prévue</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Bus Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🚌 Ligne</label>
                  <input
                    type="text"
                    value={form.line}
                    onChange={(e) => setForm({ ...form, line: e.target.value })}
                    placeholder="L14"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🚏 Quai</label>
                  <input
                    type="text"
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    placeholder="A2"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">👥 Places</label>
                  <input
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 45 })}
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Créer l&apos;arrivée
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════
   Main Page — Arrivées
   ══════════════════════════════════════════════ */
export default function ArriveesPage() {
  const { agencyId } = useAgency();
  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArrivalItem | null>(null);

  // Modal key to force reset on open
  const [createModalKey, setCreateModalKey] = useState(0);

  // WebSocket + connection status
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // ── Fetch arrivals (departures with type RETURN) ──
  const fetchArrivals = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/departures?agencyId=${agencyId}&date=${selectedDate}${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        // Filter for RETURN type departures only and map to ArrivalItem
        const mapped: ArrivalItem[] = (data.departures || [])
          .filter((dep: { departureType: string }) => dep.departureType === 'RETURN')
          .map((dep: {
            id: string;
            destination: string;
            lineNumber: string;
            platform: string | null;
            scheduledTime: string;
            status: string;
            delayMinutes: number;
            agencyId: string;
            originStationId: string | null;
            originStation: { slug: string } | null;
            createdAt: string;
            updatedAt: string;
          }) => ({
            id: dep.id,
            origin: dep.destination, // For RETURN departures, "destination" is the origin city (the bus comes from there)
            lineNumber: dep.lineNumber,
            platform: dep.platform,
            scheduledTime: dep.scheduledTime,
            status: apiToArrivalStatus(dep.status),
            delayMinutes: dep.delayMinutes || 0,
            agencyId: dep.agencyId,
            originStationId: dep.originStationId,
            originStationSlug: dep.originStation?.slug || null,
            createdAt: dep.createdAt,
            updatedAt: dep.updatedAt,
          }));
        setArrivals(mapped);
      }
    } catch (error) {
      console.error('Error fetching arrivals:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId, selectedDate, statusFilter]);

  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  // ── Connect to kiosk-service WebSocket ──
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 5000,
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketConnected(true);
      setReconnecting(false);
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => {
      setSocketConnected(false);
      setReconnecting(false);
    });
  }, []);

  // ── Preload TTS voices + WebSocket connection ──
  useEffect(() => {
    preloadVoices();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
    };
  }, [connectSocket]);

  // ── Handle reconnect ──
  const handleReconnect = useCallback(() => {
    setReconnecting(true);
    connectSocket();
    setTimeout(() => setReconnecting(false), 5000);
  }, [connectSocket]);

  // ── Emit WebSocket event for kiosk display ──
  const emitKioskEvent = useCallback((item: ArrivalItem, newStatus: ArrivalStatus) => {
    if (!socketRef.current?.connected) return;

    const timestamp = new Date().toISOString();
    const stationSlug = item.originStationSlug || '*';

    switch (newStatus) {
      case 'INCOMING':
        socketRef.current.emit('kiosk:arrivalIncoming', {
          departureId: item.id,
          origin: item.origin,
          stationSlug,
          scheduledTime: item.scheduledTime,
          timestamp,
        });
        break;
      case 'ARRIVED':
        socketRef.current.emit('kiosk:arrivalArrived', {
          departureId: item.id,
          origin: item.origin,
          platform: item.platform,
          stationSlug,
          timestamp,
        });
        break;
      case 'DELAYED':
        socketRef.current.emit('kiosk:arrivalDelayed', {
          departureId: item.id,
          origin: item.origin,
          stationSlug,
          minutes: item.delayMinutes,
          timestamp,
        });
        break;
      case 'CANCELLED':
        socketRef.current.emit('kiosk:arrivalCancelled', {
          departureId: item.id,
          origin: item.origin,
          stationSlug,
          timestamp,
        });
        break;
    }
  }, []);

  // ── Auto-announce TTS ──
  const autoAnnounce = useCallback(async (item: ArrivalItem, newStatus: ArrivalStatus) => {
    try {
      playDingDong();
      await new Promise((r) => setTimeout(r, 2000));
      const text = getTtsText(item, newStatus);
      const ok = await speakFrench(text);
      if (ok) {
        toast.success(`📢 Annonce diffusée : ${statusConfig[newStatus].label}`);
      } else {
        toast.error('TTS échoué — les voix ne sont pas encore chargées.');
      }
    } catch (err) {
      console.error('[Arrivées] autoAnnounce error:', err);
    }
  }, []);

  // ── Create arrival ──
  const handleCreate = async (data: NewArrivalForm) => {
    setSaveLoading(true);
    try {
      const scheduledTime = `${data.date}T${data.time}:00`;
      const res = await fetch('/api/admin/departures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: data.origin,
          destination: data.origin, // For RETURN: destination IS the origin city
          scheduledTime,
          lineNumber: data.line,
          platform: data.platform || undefined,
          totalSeats: data.seats,
          availableSeats: data.seats,
          departureType: 'RETURN',
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        toast.success('✅ Arrivée créée avec succès');
        fetchArrivals();
      } else {
        const err = await res.json();
        const details = err.details ? ` — ${err.details.map((d: { message: string }) => d.message).join(', ')}` : '';
        toast.error(err.error || 'Erreur lors de la création' + details);
      }
    } catch {
      toast.error('Erreur réseau lors de la création');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Change status ──
  const handleStatusChange = async (item: ArrivalItem, newStatus: ArrivalStatus) => {
    setChangingStatus(item.id);
    try {
      const apiStatus = arrivalToApiStatus[newStatus];
      const res = await fetch('/api/admin/departures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: apiStatus,
          delayMinutes: newStatus === 'DELAYED' ? Math.max(item.delayMinutes || 15, 15) : undefined,
        }),
      });
      if (res.ok) {
        // Update local state
        setArrivals((prev) =>
          prev.map((a) =>
            a.id === item.id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a
          )
        );
        toast.success(`✅ Statut mis à jour : ${statusConfig[newStatus].label}`);
        // Emit to kiosk
        const updatedItem = { ...item, status: newStatus };
        emitKioskEvent(updatedItem, newStatus);
        // Auto-announce TTS
        autoAnnounce(updatedItem, newStatus);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la mise à jour du statut');
      }
    } catch {
      toast.error('Erreur réseau lors de la mise à jour');
    } finally {
      setChangingStatus(null);
    }
  };

  // ── Delete arrival ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/departures?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setArrivals((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        toast.success('✅ Arrivée supprimée');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      } else {
        const err = await res.json();
        toast.error(err.error || err.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filtered arrivals ──
  const filteredArrivals = arrivals.filter((item) => {
    // Status filter (client-side, since API filter already applied for 'ALL' passes)
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.origin.toLowerCase().includes(q) ||
        item.lineNumber.toLowerCase().includes(q) ||
        (item.platform || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── KPI counts ──
  const kpis = {
    incoming: arrivals.filter((a) => a.status === 'INCOMING').length,
    arrived: arrivals.filter((a) => a.status === 'ARRIVED').length,
    delayed: arrivals.filter((a) => a.status === 'DELAYED').length,
    cancelled: arrivals.filter((a) => a.status === 'CANCELLED').length,
  };

  // ── Format time helper ──
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatLastUpdate = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff}min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return `Il y a ${Math.floor(diff / 1440)}j`;
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bus className="w-5 h-5 text-white rotate-180" />
            </div>
            Arrivées
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez les arrivées de bus et annoncez en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* WebSocket status */}
          <Button
            variant="outline"
            size="sm"
            onClick={socketConnected ? undefined : handleReconnect}
            disabled={socketConnected || reconnecting}
            className={`rounded-xl gap-1.5 text-xs border ${
              socketConnected
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-50 cursor-pointer'
            }`}
            title={socketConnected ? 'Kiosques connectés' : 'Cliquer pour se reconnecter'}
          >
            {reconnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : socketConnected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {reconnecting
              ? 'Reconnexion...'
              : socketConnected
                ? 'Kiosques connectés'
                : 'Connecter les kiosques'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchArrivals}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateModalKey((k) => k + 1);
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouvelle arrivée
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="En route"
          value={kpis.incoming}
          icon={<Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          colorClass="text-blue-600 dark:text-blue-400"
          bgColorClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <KpiCard
          label="Arrivés"
          value={kpis.arrived}
          icon={<CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgColorClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <KpiCard
          label="Retardés"
          value={kpis.delayed}
          icon={<Timer className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
          colorClass="text-orange-600 dark:text-orange-400"
          bgColorClass="bg-orange-100 dark:bg-orange-900/30"
        />
        <KpiCard
          label="Annulés"
          value={kpis.cancelled}
          icon={<Ban className="w-6 h-6 text-red-600 dark:text-red-400" />}
          colorClass="text-red-600 dark:text-red-400"
          bgColorClass="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="INCOMING">En route</SelectItem>
            <SelectItem value="ARRIVED">Arrivé</SelectItem>
            <SelectItem value="DELAYED">Retardé</SelectItem>
            <SelectItem value="CANCELLED">Annulé</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 w-full"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredArrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Bus className="w-8 h-8 text-slate-400 rotate-180" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Aucune arrivée</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery
                ? 'Aucun résultat ne correspond à votre recherche'
                : 'Aucune arrivée enregistrée pour cette date'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => {
                  setCreateModalKey((k) => k + 1);
                  setShowCreateModal(true);
                }}
                className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Ajouter une arrivée
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Bus / Ville d&apos;origine
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Quai
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Heure prévue
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Dernière mise à jour
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence>
                  {filteredArrivals.map((item) => {
                    const cfg = statusConfig[item.status];
                    const StatusIcon = statusIcon[item.status];
                    const transitions = availableTransitions[item.status];

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Bus / Origin */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                              <Bus className="w-4 h-4 text-purple-600 dark:text-purple-400 rotate-180" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800 dark:text-white">{item.origin}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Ligne {item.lineNumber}</p>
                            </div>
                          </div>
                        </td>

                        {/* Platform */}
                        <td className="px-4 py-3">
                          {item.platform ? (
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100">
                              <MapPin className="w-3 h-3 mr-1" />
                              Quai {item.platform}
                            </Badge>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>

                        {/* Scheduled Time */}
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                              {formatTime(item.scheduledTime)}
                            </span>
                            {item.status === 'DELAYED' && item.delayMinutes > 0 && (
                              <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                                +{item.delayMinutes}min
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge className={`${cfg.bg} ${cfg.color} hover:${cfg.bg} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </td>

                        {/* Last Updated */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatLastUpdate(item.updatedAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Status transition buttons */}
                            {transitions.map((targetStatus) => {
                              const targetCfg = statusConfig[targetStatus];
                              const TargetIcon = statusIcon[targetStatus];
                              const isChanging = changingStatus === item.id;

                              return (
                                <button
                                  key={targetStatus}
                                  onClick={() => handleStatusChange(item, targetStatus)}
                                  disabled={isChanging}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                                    targetStatus === 'ARRIVED'
                                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                      : targetStatus === 'DELAYED'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                                  }`}
                                  title={`Passer à : ${targetCfg.label}`}
                                >
                                  {isChanging ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <TargetIcon className="w-3 h-3" />
                                  )}
                                  {targetCfg.label}
                                </button>
                              );
                            })}

                            {/* TTS test button */}
                            <button
                              onClick={() => autoAnnounce(item, item.status)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                              title="Annoncer cette arrivée"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deletingId === item.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Count footer ── */}
      {!loading && filteredArrivals.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            {filteredArrivals.length} arrivée(s) affichée(s)
            {arrivals.length !== filteredArrivals.length && ` sur ${arrivals.length}`}
          </span>
          <span>
            {arrivals.filter((a) => a.status !== 'ARRIVED' && a.status !== 'CANCELLED').length} en cours
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* DIALOGS                                            */}
      {/* ════════════════════════════════════════════════════ */}

      {/* ── New Arrival Modal ── */}
      <NewArrivalModal
        key={createModalKey}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        loading={saveLoading}
        agencyId={agencyId}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Supprimer cette arrivée ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L&apos;arrivée de{' '}
              <span className="font-semibold text-slate-800 dark:text-white">{deleteTarget?.origin}</span>{' '}
              (Ligne {deleteTarget?.lineNumber}) sera définitivement supprimée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deletingId !== null}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deletingId ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
