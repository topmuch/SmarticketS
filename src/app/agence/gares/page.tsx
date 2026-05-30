'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  QrCode,
  ExternalLink,
  Copy,
  CheckCircle,
  Building2,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAgency } from '../layout';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
    departures: number;
  };
  createdAt: string;
}

interface StationFormData {
  name: string;
  city: string;
  address: string;
  isActive: boolean;
}

const emptyForm: StationFormData = {
  name: '',
  city: '',
  address: '',
  isActive: true,
};

/* ══════════════════════════════════════════════
   Station URL Card (QR Code + URL)
   ══════════════════════════════════════════════ */
function StationUrlCard({
  stationName,
  slug,
  onClose,
}: {
  stationName: string;
  slug: string;
  onClose: () => void;
}) {
  const publicUrl = `/signage-slug/${slug}`;
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
      toast.error('Impossible de copier l\'URL');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {stationName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              /{slug}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm"
        >
          Fermer
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR Code */}
        <div className="shrink-0 p-4 bg-white rounded-xl border border-slate-200 dark:border-slate-700">
          <QRCodeSVG
            value={fullUrl}
            size={140}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0f172a"
            includeMargin={false}
          />
        </div>

        {/* URL + Actions */}
        <div className="flex-1 w-full space-y-3">
          <div>
            <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              URL publique de l'affichage
            </Label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
              <code className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1 font-mono">
                {publicUrl}
              </code>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copié' : 'Copier l\'URL'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Imprimez ce QR code et affichez-le dans votre gare pour que les
            voyageurs scannent l\'affichage en temps réel.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Page — Gestion des Gares
   ══════════════════════════════════════════════ */
export default function GaresPage() {
  const { agencyId } = useAgency();

  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<StationFormData>(emptyForm);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [editForm, setEditForm] = useState<StationFormData>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle loading
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  // Show URL card for newly created station
  const [showUrlCard, setShowUrlCard] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  /* ── Fetch Stations ── */
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setStations(data.stations || []);
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
        const newStation = data.station;
        toast.success(`Gare "${newStation.name}" créée avec succès`);
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        setShowUrlCard({ name: newStation.name, slug: newStation.slug });
        fetchStations();
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

  /* ── Edit Station ── */
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStation || !editForm.name.trim() || !editForm.city.trim()) return;

    setEditLoading(true);
    try {
      const res = await fetch(`/api/stations/${editStation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          city: editForm.city.trim(),
          address: editForm.address.trim() || undefined,
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) {
        toast.success(`Gare "${editForm.name}" mise à jour`);
        setShowEditModal(false);
        setEditStation(null);
        setEditForm(emptyForm);
        fetchStations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur lors de la modification');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Delete Station ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/stations/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Gare "${deleteTarget.name}" supprimée`);
        setDeleteTarget(null);
        fetchStations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── Toggle Active ── */
  const handleToggle = async (station: Station) => {
    setToggleLoadingId(station.id);
    try {
      const res = await fetch(`/api/stations/${station.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !station.isActive }),
      });
      if (res.ok) {
        toast.success(
          station.isActive
            ? `Gare "${station.name}" désactivée`
            : `Gare "${station.name}" activée`
        );
        fetchStations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setToggleLoadingId(null);
    }
  };

  /* ── Open Edit Modal ── */
  const openEditModal = (station: Station) => {
    setEditStation(station);
    setEditForm({
      name: station.name,
      city: station.city,
      address: station.address || '',
      isActive: station.isActive,
    });
    setShowEditModal(true);
  };

  /* ── Show URL Card for existing station ── */
  const showStationUrl = (station: Station) => {
    setShowUrlCard({ name: station.name, slug: station.slug });
  };

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Gares
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos gares et obtenez les URLs d'affichage public
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={() => {
              setCreateForm(emptyForm);
              setShowCreateModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Nouvelle gare
          </Button>
        </div>
      </div>

      {/* URL Card (shown after create or when clicking QR) */}
      {showUrlCard && (
        <StationUrlCard
          stationName={showUrlCard.name}
          slug={showUrlCard.slug}
          onClose={() => setShowUrlCard(null)}
        />
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4"
            >
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && stations.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Aucune gare
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Créez votre première gare pour obtenir une URL publique
            d&apos;affichage et un QR code à imprimer.
          </p>
          <Button
            onClick={() => {
              setCreateForm(emptyForm);
              setShowCreateModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Créer une gare
          </Button>
        </div>
      )}

      {/* Station List */}
      {!loading && stations.length > 0 && (
        <div className="space-y-3">
          {stations.map((station) => (
            <div
              key={station.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4 transition-all ${
                station.isActive
                  ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    station.isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Building2
                    className={`w-5 h-5 ${
                      station.isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {station.name}
                    </h3>
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
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {station.city}
                      {station.address ? ` — ${station.address}` : ''}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      /{station.slug}
                    </span>
                  </div>
                </div>

                {/* Departures Count */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {station._count?.departures ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    départs
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* QR Code / URL */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                    onClick={() => showStationUrl(station)}
                    title="Voir QR code et URL"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>

                  {/* Toggle Active */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      station.isActive
                        ? 'text-emerald-500 hover:text-slate-600'
                        : 'text-slate-400 hover:text-emerald-500'
                    }`}
                    onClick={() => handleToggle(station)}
                    disabled={toggleLoadingId === station.id}
                    title={
                      station.isActive
                        ? 'Désactiver la gare'
                        : 'Activer la gare'
                    }
                  >
                    {toggleLoadingId === station.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                    onClick={() => openEditModal(station)}
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => setDeleteTarget(station)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer la gare &quot;{station.name}&quot; ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Tous les départs
                          associés à cette gare seront conservés, mais la gare
                          sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          onClick={() => setDeleteTarget(null)}
                        >
                          Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleteLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deleteLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Station Dialog ── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Nouvelle gare
            </DialogTitle>
            <DialogDescription>
              Créez une gare pour obtenir une URL publique d&apos;affichage
              et un QR code unique.
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
                onClick={() => setShowCreateModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

      {/* ── Edit Station Dialog ── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Modifier la gare
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations de la gare. Le slug ne peut pas être
              modifié.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Nom de la gare <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-city">
                Ville <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm({ ...editForm, city: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
              />
            </div>

            {/* Slug (read-only) */}
            {editStation && (
              <div className="space-y-2">
                <Label className="text-slate-500 dark:text-slate-400">
                  Slug
                </Label>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
                  <code className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    /{editStation.slug}
                  </code>
                  <span className="text-xs text-slate-400">(non modifiable)</span>
                </div>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div>
                <Label className="text-sm font-medium">Gare active</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editForm.isActive
                    ? 'La gare est visible publiquement'
                    : 'La gare est masquée de l\'affichage public'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditForm({ ...editForm, isActive: !editForm.isActive })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  editForm.isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                role="switch"
                aria-checked={editForm.isActive}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    editForm.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
