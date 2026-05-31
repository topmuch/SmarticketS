'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Upload,
  Bus,
  Search,
  RefreshCw,
  CalendarDays,
  Users,
  ChevronDown,
  Play,
  Ban,
  Timer,
  MapPin,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useAgency } from '../layout';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface StationOption {
  id: string;
  name: string;
  city: string;
  slug: string;
}

interface DepartureItem {
  id: string;
  routeId: string | null;
  route: { id: string; name: string; origin: string; destination: string } | null;
  departureType: 'OUTBOUND' | 'RETURN';
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  availableSeats: number;
  totalSeats: number;
  status: string;
  delayMinutes: number;
  soldSeats: number;
  fillRate: number;
  // Multi-gare
  originStationId: string | null;
  originStation: StationOption | null;
  destinationStationId: string | null;
  destinationStation: StationOption | null;
  createdAt: string;
}

interface NewDepartureForm {
  departureType: 'OUTBOUND' | 'RETURN';
  origin: string;
  destination: string;
  date: string;
  time: string;
  line: string;
  platform: string;
  seats: number;
  price: number;
  isRoundTrip: boolean;
  returnDelayHours: number;
  // Multi-gare
  originStationId: string;
  destinationStationId: string;
}

const emptyForm: NewDepartureForm = {
  departureType: 'OUTBOUND',
  origin: '',
  destination: '',
  date: new Date().toISOString().split('T')[0],
  time: '',
  line: '',
  platform: '',
  seats: 45,
  price: 0,
  isRoundTrip: false,
  returnDelayHours: 2,
  originStationId: '',
  destinationStationId: '',
};

interface EditDepartureForm {
  departureType: 'OUTBOUND' | 'RETURN';
  lineNumber: string;
  destination: string;
  date: string;
  time: string;
  platform: string;
  totalSeats: number;
  availableSeats: number;
  // Multi-gare
  originStationId: string;
  destinationStationId: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  SCHEDULED: { label: 'Programmé', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Clock },
  BOARDING: { label: 'Embarquement', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Play },
  DEPARTED: { label: 'Parti', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle },
  CANCELLED: { label: 'Annulé', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: Ban },
  DELAYED: { label: 'Retardé', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: Timer },
};

/* ══════════════════════════════════════════════
   KPI Card Component
   ══════════════════════════════════════════════ */
function KpiCard({ label, value, icon, colorClass, bgColorClass }: {
  label: string;
  value: number;
  icon: string;
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
   New Departure Modal (Simplified Form)
   ══════════════════════════════════════════════ */
function NewDepartureModal({
  isOpen,
  onClose,
  onSave,
  loading,
  agencyId,
  stations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewDepartureForm) => void;
  loading: boolean;
  agencyId: string;
  stations: StationOption[];
}) {
  const [form, setForm] = useState<NewDepartureForm>(emptyForm);
  const [existingRoutes, setExistingRoutes] = useState<{ id: string; origin: string; destination: string }[]>([]);

  // Fetch existing routes for auto-suggestions
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
    if (!form.origin.trim() || !form.destination.trim() || !form.time) return;
    onSave(form);
  };

  // Filter suggestions based on input
  const originSuggestions = existingRoutes
    .map(r => r.origin)
    .filter((v, i, a) => a.indexOf(v) === i && v.toLowerCase().includes((form.origin || '').toLowerCase()))
    .slice(0, 5);

  const destSuggestions = existingRoutes
    .map(r => r.destination)
    .filter((v, i, a) => a.indexOf(v) === i && v.toLowerCase().includes((form.destination || '').toLowerCase()))
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
            <div className="bg-gradient-to-r from-[#FF1D8D] to-[#7c3aed] px-6 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Nouveau départ</h3>
                    <p className="text-white/70 text-xs">La route sera créée automatiquement si nécessaire</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Departure Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  🚦 Type de trajet
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureType: 'OUTBOUND' })}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      form.departureType === 'OUTBOUND'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    ↗️ Aller (Départ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureType: 'RETURN' })}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      form.departureType === 'RETURN'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    ↘️ Retour (Arrivée)
                  </button>
                </div>
              </div>

              {/* Origin / Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  🛣️ Trajet (Origine → Destination)
                </label>
                <div className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      placeholder="Ex: Dakar"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                      required
                      list="origin-list"
                    />
                    <datalist id="origin-list">
                      {originSuggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div className="flex items-center justify-center pb-0.5">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      placeholder="Ex: Saint Louis"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                      required
                      list="dest-list"
                    />
                    <datalist id="dest-list">
                      {destSuggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Station selectors (multi-gare) */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    🏢 Associer à des gares
                  </span>
                </div>
                {stations.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          Gare de départ
                        </label>
                        <select
                          value={form.originStationId}
                          onChange={(e) => {
                            const stationId = e.target.value;
                            const station = stations.find(s => s.id === stationId);
                            setForm({
                              ...form,
                              originStationId: stationId,
                              origin: station ? station.city : form.origin,
                            });
                          }}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        >
                          <option value="">— Aucune (non lié) —</option>
                          {stations.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.city})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                          Gare d'arrivée
                        </label>
                        <select
                          value={form.destinationStationId}
                          onChange={(e) => {
                            const stationId = e.target.value;
                            const station = stations.find(s => s.id === stationId);
                            setForm({
                              ...form,
                              destinationStationId: stationId,
                              destination: station ? station.city : form.destination,
                            });
                          }}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        >
                          <option value="">— Aucune (non lié) —</option>
                          {stations.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Associer un départ à une gare pour qu'il apparaisse sur l'affichage public de cette gare.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Aucune gare créée.{' '}
                      <a href="/agence/gares" className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700">
                        Créer une gare →
                      </a>
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Les gares permettent d'afficher les départs sur un écran public dans votre gare physique.
                    </p>
                  </div>
                )}
              </div>

              {/* Date / Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🕐 Heure</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">👥 Sièges</label>
                  <input
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: parseInt(e.target.value) || 45 })}
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">💰 Prix du billet (FCFA)</label>
                <input
                  type="number"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                  placeholder="10000"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                />
              </div>

              {/* Round Trip */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRoundTrip}
                    onChange={(e) => setForm({ ...form, isRoundTrip: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-[#FF1D8D] focus:ring-[#FF1D8D]/30"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Créer aussi le trajet retour automatiquement
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Un départ retour sera créé avec +{form.returnDelayHours}h de décalage
                    </p>
                  </div>
                  <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                </label>
                {form.isRoundTrip && (
                  <div className="mt-3 ml-8">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Décalage retour (heures)
                    </label>
                    <input
                      type="number"
                      value={form.returnDelayHours}
                      onChange={(e) => setForm({ ...form, returnDelayHours: parseInt(e.target.value) || 2 })}
                      min={1}
                      max={24}
                      className="w-32 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30 focus:border-[#FF1D8D] transition-all"
                    />
                  </div>
                )}
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
                  className="flex-1 px-4 py-3 bg-[#FF1D8D] hover:bg-[#e0187d] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Créer le départ
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
   Edit Departure Modal
   ══════════════════════════════════════════════ */
function EditDepartureModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
  stations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditDepartureForm) => void;
  initialData: DepartureItem | null;
  loading: boolean;
  stations: StationOption[];
}) {
  const getInitialForm = (): EditDepartureForm => {
    if (!initialData) {
      return {
        departureType: 'OUTBOUND',
        lineNumber: '',
        destination: '',
        date: '',
        time: '',
        platform: '',
        totalSeats: 45,
        availableSeats: 45,
        originStationId: '',
        destinationStationId: '',
      };
    }
    const st = new Date(initialData.scheduledTime);
    return {
      departureType: initialData.departureType,
      lineNumber: initialData.lineNumber,
      destination: initialData.destination,
      date: st.toISOString().split('T')[0],
      time: st.toTimeString().slice(0, 5),
      platform: initialData.platform || '',
      totalSeats: initialData.totalSeats,
      availableSeats: initialData.availableSeats,
      originStationId: initialData.originStationId || '',
      destinationStationId: initialData.destinationStationId || '',
    };
  };

  // Use lazy initializer — form is initialized from initialData on mount
  const [form, setForm] = useState<EditDepartureForm>(getInitialForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#FF1D8D] to-[#7c3aed] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Modifier le départ</h3>
                    <p className="text-white/70 text-xs">Mettez à jour les informations</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Departure Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureType: 'OUTBOUND' })}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      form.departureType === 'OUTBOUND'
                        ? 'border-[#FF1D8D] bg-[#FF1D8D]/10 text-[#FF1D8D]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    ALLER
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, departureType: 'RETURN' })}
                    className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      form.departureType === 'RETURN'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    RETOUR
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ligne</label>
                  <input
                    type="text"
                    value={form.lineNumber}
                    onChange={(e) => setForm({ ...form, lineNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination</label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Heure</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quai</label>
                  <input
                    type="text"
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total</label>
                  <input
                    type="number"
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 45 })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dispo.</label>
                  <input
                    type="number"
                    value={form.availableSeats}
                    onChange={(e) => setForm({ ...form, availableSeats: parseInt(e.target.value) || 45 })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1D8D]/30"
                    required
                  />
                </div>
              </div>

              {/* Station selectors (multi-gare) */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    🏢 Gares associées
                  </span>
                </div>
                {stations.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Gare de départ
                      </label>
                      <select
                        value={form.originStationId}
                        onChange={(e) => setForm({ ...form, originStationId: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      >
                        <option value="">— Aucune —</option>
                        {stations.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.city})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Gare d'arrivée
                      </label>
                      <select
                        value={form.destinationStationId}
                        onChange={(e) => setForm({ ...form, destinationStationId: e.target.value })}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      >
                        <option value="">— Aucune —</option>
                        {stations.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                    Aucune gare disponible.{' '}
                    <a href={'/agence/gares'} className="text-emerald-600 dark:text-emerald-400 underline font-semibold">
                      Créer une gare →
                    </a>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF1D8D] to-[#7c3aed] text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" />Enregistrer</>}
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
   Main Page — Départs Unifiée
   ══════════════════════════════════════════════ */
export default function DepartsPage() {
  const { agencyId } = useAgency();
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<DepartureItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: string[] } | null>(null);
  // Multi-gare: stations list
  const [stations, setStations] = useState<StationOption[]>([]);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setStations((data.stations || []).map((s: { id: string; name: string; city: string; slug: string }) => ({
          id: s.id,
          name: s.name,
          city: s.city,
          slug: s.slug,
        })));
      }
    } catch {
      // silently fail - stations are optional
    }
  }, [agencyId]);

  // Fetch departures
  const fetchDepartures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/departures?agencyId=${agencyId}&date=${selectedDate}${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setDepartures(data.departures || []);
      }
    } catch (error) {
      console.error('Error fetching departures:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId, selectedDate, statusFilter]);

  useEffect(() => {
    if (agencyId) {
      fetchStations();
      fetchDepartures();
    }
  }, [agencyId, fetchStations, fetchDepartures]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Create departure (unified: auto-route creation + optional round-trip)
  const handleCreate = async (data: NewDepartureForm) => {
    setSaveLoading(true);
    try {
      const scheduledTime = `${data.date}T${data.time}:00`;
      const res = await fetch('/api/admin/departures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: data.origin,
          destination: data.destination,
          scheduledTime,
          lineNumber: data.line,
          platform: data.platform || undefined,
          totalSeats: data.seats,
          availableSeats: data.seats,
          price: data.price != null ? data.price : undefined,
          departureType: data.departureType || 'OUTBOUND',
          isRoundTrip: data.isRoundTrip,
          returnDelayHours: data.returnDelayHours,
          // Multi-gare
          originStationId: data.originStationId || undefined,
          destinationStationId: data.destinationStationId || undefined,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const count = result.createdReturn ? 2 : 1;
        setShowCreateModal(false);
        showToast(`✅ ${count} départ(s) créé(s) avec succès`, 'success');
        fetchDepartures();
      } else {
        const err = await res.json();
        const details = err.details ? ` — ${err.details.map((d: { message: string }) => d.message).join(', ')}` : '';
        showToast(err.error || 'Erreur lors de la création' + details, 'error');
      }
    } catch {
      showToast('Erreur réseau', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Update departure status
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/departures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        showToast(`Statut mis à jour : ${statusConfig[status]?.label || status}`, 'success');
        fetchDepartures();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur', 'error');
      }
    } catch {
      showToast('Erreur réseau', 'error');
    }
  };

  // Edit departure
  const handleEdit = async (data: EditDepartureForm) => {
    if (!editingDeparture) return;
    setSaveLoading(true);
    try {
      const scheduledTime = `${data.date}T${data.time}:00`;
      const res = await fetch('/api/admin/departures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDeparture.id,
          departureType: data.departureType,
          lineNumber: data.lineNumber,
          destination: data.destination,
          scheduledTime,
          platform: data.platform || null,
          totalSeats: data.totalSeats,
          availableSeats: data.availableSeats,
          // Multi-gare
          originStationId: data.originStationId || null,
          destinationStationId: data.destinationStationId || null,
        }),
      });
      if (res.ok) {
        setEditingDeparture(null);
        showToast('Départ mis à jour', 'success');
        fetchDepartures();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur', 'error');
      }
    } catch {
      showToast('Erreur réseau', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete departure
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce départ ?')) return;
    try {
      const res = await fetch(`/api/admin/departures?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Départ supprimé', 'success');
        fetchDepartures();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur', 'error');
      }
    } catch {
      showToast('Erreur réseau', 'error');
    }
  };

  // CSV import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/departures', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setCsvResult({ created: data.createdCount, errors: data.errors || [] });
        showToast(`${data.createdCount} départ(s) importé(s)`, 'success');
        fetchDepartures();
      } else {
        showToast(data.error || 'Erreur CSV', 'error');
      }
    } catch {
      showToast('Erreur réseau', 'error');
    } finally {
      setCsvLoading(false);
      e.target.value = '';
    }
  };

  // Filter
  const filteredDepartures = departures.filter((d) => {
    if (typeFilter !== 'ALL' && d.departureType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.lineNumber.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q) ||
        (d.route?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPIs
  const scheduledCount = departures.filter((d) => d.status === 'SCHEDULED').length;
  const departedCount = departures.filter((d) => d.status === 'DEPARTED').length;
  const totalSeats = departures.reduce((sum, d) => sum + d.totalSeats, 0);
  const totalAvailable = departures.reduce((sum, d) => sum + d.availableSeats, 0);

  const getNextStatus = (current: string): { status: string; icon: typeof Play; label: string } | null => {
    switch (current) {
      case 'SCHEDULED': return { status: 'BOARDING', icon: Play, label: 'Embarquement' };
      case 'BOARDING': return { status: 'DEPARTED', icon: CheckCircle, label: 'Départ' };
      case 'DELAYED': return { status: 'SCHEDULED', icon: Clock, label: 'Rétablir' };
      default: return null;
    }
  };



  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF1D8D] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#FF1D8D]/20">
              <Bus className="w-5 h-5 text-white" />
            </div>
            Départs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos départs — les routes sont créées automatiquement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* CSV Import */}
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-[#FF1D8D] hover:text-[#FF1D8D] transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            Import CSV
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={csvLoading} />
            {csvLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </label>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF1D8D] hover:bg-[#e0187d] text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF1D8D]/20"
          >
            <Plus className="w-4 h-4" />
            Nouveau départ
          </button>
        </div>
      </div>

      {/* CSV Result */}
      {csvResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            csvResult.errors.length > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ✅ {csvResult.created} départ(s) importé(s) avec succès
          </p>
          {csvResult.errors.length > 0 && (
            <div className="mt-2 max-h-24 overflow-y-auto">
              {csvResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-amber-600">⚠️ {err}</p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Programmés" value={scheduledCount} icon="🕐" colorClass="text-blue-600 dark:text-blue-400" bgColorClass="bg-blue-100 dark:bg-blue-900/30" />
        <KpiCard label="Partis" value={departedCount} icon="✅" colorClass="text-emerald-600 dark:text-emerald-400" bgColorClass="bg-emerald-100 dark:bg-emerald-900/30" />
        <KpiCard label="Total places" value={totalSeats} icon="👥" colorClass="text-slate-900 dark:text-white" bgColorClass="bg-slate-100 dark:bg-slate-800" />
        <KpiCard label="Disponibles" value={totalAvailable} icon="🚌" colorClass="text-[#FF1D8D]" bgColorClass="bg-[#FF1D8D]/10" />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-800">
          <CalendarDays className="w-4 h-4 text-[#FF1D8D]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl px-1 py-1 border border-slate-200 dark:border-slate-800">
          {[
            { value: 'ALL', label: 'Tous' },
            { value: 'OUTBOUND', label: 'Aller' },
            { value: 'RETURN', label: 'Retour' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === opt.value
                  ? 'bg-[#FF1D8D] text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl px-1 py-1 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-1.5 cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SCHEDULED">Programmé</option>
            <option value="BOARDING">Embarquement</option>
            <option value="DEPARTED">Parti</option>
            <option value="DELAYED">Retardé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-800 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
          />
          <button
            onClick={fetchDepartures}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Departures Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#FF1D8D] animate-spin" />
            <span className="text-slate-500">Chargement des départs...</span>
          </div>
        </div>
      ) : filteredDepartures.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Bus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
            Aucun départ pour cette date
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Créez un nouveau départ ou changez la date
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-[#FF1D8D] text-white rounded-xl font-semibold text-sm hover:bg-[#e0187d] transition-all"
          >
            + Créer un départ
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Ligne</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Destination</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Heure</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Quai</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Places</th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Statut</th>
                  <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartures.map((dep, index) => {
                  const status = statusConfig[dep.status] || statusConfig.SCHEDULED;
                  const StatusIcon = status.icon;
                  const nextAction = getNextStatus(dep.status);
                  const fillPercent = dep.totalSeats > 0 ? Math.round((dep.soldSeats / dep.totalSeats) * 100) : 0;

                  return (
                    <motion.tr
                      key={dep.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          dep.departureType === 'RETURN'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            : 'bg-[#FF1D8D]/10 text-[#FF1D8D]'
                        }`}>
                          {dep.departureType === 'RETURN' ? 'RETOUR' : 'ALLER'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{dep.lineNumber}</span>
                        {dep.route && <p className="text-xs text-slate-400 mt-0.5">{dep.route.origin} → {dep.route.destination}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{dep.destination}</span>
                        {dep.originStation && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Départ: {dep.originStation.name}
                          </p>
                        )}
                        {dep.destinationStation && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Arrivée: {dep.destinationStation.name}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {new Date(dep.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {dep.delayMinutes > 0 && (
                          <span className="ml-1.5 text-[11px] font-bold text-orange-500">+{dep.delayMinutes}min</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{dep.platform || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                fillPercent > 90 ? 'bg-red-500' : fillPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(fillPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {dep.availableSeats}/{dep.totalSeats}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${status.bg} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {nextAction && (
                            <button
                              onClick={() => handleUpdateStatus(dep.id, nextAction.status)}
                              className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                dep.status === 'SCHEDULED' ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'
                              }`}
                              title={nextAction.label}
                            >
                              <nextAction.icon className="w-4 h-4" />
                            </button>
                          )}
                          {(dep.status === 'SCHEDULED' || dep.status === 'DELAYED') && (
                            <button
                              onClick={() => handleUpdateStatus(dep.id, 'CANCELLED')}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                              title="Annuler"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingDeparture(dep)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#FF1D8D] transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dep.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDepartures.map((dep) => {
              const status = statusConfig[dep.status] || statusConfig.SCHEDULED;
              const StatusIcon = status.icon;
              const nextAction = getNextStatus(dep.status);
              const fillPercent = dep.totalSeats > 0 ? Math.round((dep.soldSeats / dep.totalSeats) * 100) : 0;

              return (
                <div key={dep.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        dep.departureType === 'RETURN'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-[#FF1D8D]/10 text-[#FF1D8D]'
                      }`}>
                        {dep.departureType === 'RETURN' ? 'RETOUR' : 'ALLER'}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{dep.lineNumber}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${status.bg} ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                        {dep.destination}
                      </p>
                      {(dep.originStation || dep.destinationStation) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dep.originStation && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              <Building2 className="w-2.5 h-2.5" />
                              {dep.originStation.name}
                            </span>
                          )}
                          {dep.destinationStation && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              <Building2 className="w-2.5 h-2.5" />
                              {dep.destinationStation.name}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(dep.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {dep.platform && <> · Quai {dep.platform}</>}
                        {dep.delayMinutes > 0 && <span className="text-orange-500 ml-1">+{dep.delayMinutes}min</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${fillPercent > 90 ? 'bg-red-500' : fillPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(fillPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{dep.availableSeats}/{dep.totalSeats}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {nextAction && (
                      <button
                        onClick={() => handleUpdateStatus(dep.id, nextAction.status)}
                        className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      >
                        {nextAction.label}
                      </button>
                    )}
                    <button
                      onClick={() => setEditingDeparture(dep)}
                      className="py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dep.id)}
                      className="py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <NewDepartureModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        loading={saveLoading}
        agencyId={agencyId}
        stations={stations}
      />
      <EditDepartureModal
        key={editingDeparture?.id || 'none'}
        isOpen={!!editingDeparture}
        onClose={() => setEditingDeparture(null)}
        onSave={handleEdit}
        initialData={editingDeparture}
        loading={saveLoading}
        stations={stations}
      />
    </div>
  );
}
