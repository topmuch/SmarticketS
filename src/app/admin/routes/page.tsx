'use client';

import AdminLayout from '@/components/admin/NewAdminLayout';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Route as RouteIcon,
  Clock,
  MapPin,
  Banknote,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────
interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  isRoundTrip: boolean;
  durationMinutes: number | null;
  distanceKm: number | null;
  price: number | null;
  agencyId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { departures: number };
}

interface RouteFormData {
  name: string;
  origin: string;
  destination: string;
  isRoundTrip: boolean;
  durationMinutes: string;
  distanceKm: string;
  price: string;
}

const emptyForm: RouteFormData = {
  name: '',
  origin: '',
  destination: '',
  isRoundTrip: false,
  durationMinutes: '',
  distanceKm: '',
  price: '',
};

// ── Component ──────────────────────────────────────────────
export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [form, setForm] = useState<RouteFormData>(emptyForm);

  // ── Fetch agency session ───────────────────────────────
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

  // ── Fetch routes ───────────────────────────────────────
  const fetchRoutes = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/routes?agencyId=${agencyId}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setRoutes(data.routes || data || []);
    } catch {
      toast.error('Erreur lors du chargement des trajets');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (agencyId) fetchRoutes();
  }, [agencyId, fetchRoutes]);

  // ── Auto-generate name from origin ↔ destination ────────
  const updateForm = (updates: Partial<RouteFormData>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      // Auto-generate name if origin and destination are present
      if (updates.origin || updates.destination) {
        const origin = updates.origin ?? prev.origin;
        const destination = updates.destination ?? prev.destination;
        if (origin && destination) {
          next.name = `${origin} \u2194 ${destination}`;
        }
      }
      return next;
    });
  };

  // ── Open create dialog ─────────────────────────────────
  const openCreate = () => {
    setEditingRoute(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // ── Open edit dialog ───────────────────────────────────
  const openEdit = (route: Route) => {
    setEditingRoute(route);
    setForm({
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      isRoundTrip: route.isRoundTrip,
      durationMinutes: route.durationMinutes?.toString() ?? '',
      distanceKm: route.distanceKm?.toString() ?? '',
      price: route.price?.toString() ?? '',
    });
    setDialogOpen(true);
  };

  // ── Save (create or update) ────────────────────────────
  const handleSave = async () => {
    if (!form.origin || !form.destination) {
      toast.error('Ville de départ et d\'arrivée sont obligatoires');
      return;
    }
    if (!agencyId) {
      toast.error('Session non chargée, veuillez réessayer');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name || `${form.origin} \u2194 ${form.destination}`,
        origin: form.origin,
        destination: form.destination,
        isRoundTrip: form.isRoundTrip,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : null,
        distanceKm: form.distanceKm ? parseInt(form.distanceKm, 10) : null,
        price: form.price ? parseInt(form.price, 10) : null,
        agencyId,
      };

      const url = editingRoute
        ? `/api/admin/routes?id=${editingRoute.id}`
        : '/api/admin/routes';
      const method = editingRoute ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'enregistrement');
      }

      toast.success(editingRoute ? 'Trajet modifié avec succès' : 'Trajet créé avec succès');
      setDialogOpen(false);
      fetchRoutes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/routes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression');
      }
      toast.success('Trajet supprimé avec succès');
      fetchRoutes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  // ── Status badge colors ────────────────────────────────
  const statusBadge = (isRoundTrip: boolean) =>
    isRoundTrip ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <ArrowRightLeft className="w-3 h-3 mr-1" />
        Aller-Retour
      </Badge>
    ) : (
      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Simple</Badge>
    );

  // ── Loading skeleton ───────────────────────────────────
  if (loading) {
    return (
      <AdminLayout title="Gestion des Trajets" subtitle="Créez et gérez les trajets de transport">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="rounded-xl border bg-white overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestion des Trajets" subtitle="Créez et gérez les trajets de transport">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <RouteIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">{routes.length} trajet(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchRoutes} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Actualiser
            </Button>
            <Button size="sm" onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
              <Plus className="w-4 h-4 mr-1.5" />
              Nouveau Trajet
            </Button>
          </div>
        </div>

        {/* Table */}
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border">
            <RouteIcon className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Aucun trajet créé</p>
            <p className="text-sm text-slate-400 mt-1">Commencez par ajouter votre premier trajet</p>
            <Button
              size="sm"
              onClick={openCreate}
              className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Créer un trajet
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="font-semibold text-slate-600">Nom</TableHead>
                    <TableHead className="font-semibold text-slate-600">Origine</TableHead>
                    <TableHead className="font-semibold text-slate-600">Destination</TableHead>
                    <TableHead className="font-semibold text-slate-600">Aller-Retour</TableHead>
                    <TableHead className="font-semibold text-slate-600">Durée</TableHead>
                    <TableHead className="font-semibold text-slate-600">Distance</TableHead>
                    <TableHead className="font-semibold text-slate-600">Prix</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id} className="group">
                      <TableCell className="font-medium text-slate-800">{route.name}</TableCell>
                      <TableCell className="text-slate-600">{route.origin}</TableCell>
                      <TableCell className="text-slate-600">{route.destination}</TableCell>
                      <TableCell>{statusBadge(route.isRoundTrip)}</TableCell>
                      <TableCell className="text-slate-600">
                        {route.durationMinutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {route.durationMinutes} min
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {route.distanceKm ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {route.distanceKm} km
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {route.price ? (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                            {route.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(route)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                                <AlertDialogTitle>Supprimer ce trajet ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le trajet &laquo;&nbsp;{route.name}&nbsp;&raquo; sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(route.id)}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Modifier le trajet' : 'Nouveau trajet'}</DialogTitle>
              <DialogDescription>
                {editingRoute
                  ? 'Modifiez les informations du trajet.'
                  : 'Remplissez les informations pour créer un nouveau trajet.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Nom du trajet */}
              <div className="space-y-2">
                <Label htmlFor="route-name">Nom du trajet</Label>
                <Input
                  id="route-name"
                  placeholder="Ex: Dakar ↔ Mbour"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <p className="text-xs text-slate-400">Auto-généré si laissé vide</p>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route-origin">Ville de départ *</Label>
                  <Input
                    id="route-origin"
                    placeholder="Ex: Dakar"
                    value={form.origin}
                    onChange={(e) => updateForm({ origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-destination">Ville d&apos;arrivée *</Label>
                  <Input
                    id="route-destination"
                    placeholder="Ex: Mbour"
                    value={form.destination}
                    onChange={(e) => updateForm({ destination: e.target.value })}
                  />
                </div>
              </div>

              {/* Aller-Retour */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="route-roundtrip" className="cursor-pointer">Aller-Retour</Label>
                  <p className="text-xs text-slate-400">Trajet aller-retour</p>
                </div>
                <Switch
                  id="route-roundtrip"
                  checked={form.isRoundTrip}
                  onCheckedChange={(checked) => setForm({ ...form, isRoundTrip: checked })}
                />
              </div>

              {/* Duration & Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route-duration">Durée (minutes)</Label>
                  <Input
                    id="route-duration"
                    type="number"
                    min="1"
                    placeholder="Ex: 90"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route-distance">Distance (km)</Label>
                  <Input
                    id="route-distance"
                    type="number"
                    min="1"
                    placeholder="Ex: 80"
                    value={form.distanceKm}
                    onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="route-price">Prix (FCFA)</Label>
                <Input
                  id="route-price"
                  type="number"
                  min="0"
                  placeholder="Ex: 5000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
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
                  : editingRoute
                  ? 'Modifier'
                  : 'Créer le trajet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}


