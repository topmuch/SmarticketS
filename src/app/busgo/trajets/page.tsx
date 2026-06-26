'use client';

/**
 * BusGo Trajets — Liste + Création + Actions (modifier, supprimer, retarder, annuler).
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, MapPin, Loader2, AlertCircle, Bus, Calendar, Plus, User, Phone,
  Pencil, Trash2, XCircle, AlertTriangle, MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  availableSeats: number;
  totalSeats: number;
  delayMinutes: number;
  agentName: string | null;
  agentPhone: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  SCHEDULED: { label: 'Programmé', variant: 'secondary' },
  BOARDING: { label: 'Embarquement', variant: 'default' },
  DEPARTED: { label: 'Parti', variant: 'outline' },
  DELAYED: { label: 'Retardé', variant: 'destructive' },
  CANCELLED: { label: 'Annulé', variant: 'destructive' },
};

export default function BusGoTrajetsPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<Departure | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Departure | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    lineNumber: '', destination: '', scheduledTime: '', platform: '',
    totalSeats: 45, agentName: '', agentPhone: '',
  });
  const [editForm, setEditForm] = useState({
    lineNumber: '', destination: '', scheduledTime: '', platform: '',
    totalSeats: 45, agentName: '', agentPhone: '',
  });

  const fetchDepartures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=all', { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setDepartures(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

  const handleCreate = async () => {
    if (!form.lineNumber || !form.destination || !form.scheduledTime) {
      toast.error('Ligne, destination et heure sont requis');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/busgo/trajets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Trajet créé avec succès !');
      setCreateOpen(false);
      setForm({ lineNumber: '', destination: '', scheduledTime: '', platform: '', totalSeats: 45, agentName: '', agentPhone: '' });
      fetchDepartures();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (dep: Departure) => {
    // Format scheduledTime for datetime-local input
    const dt = new Date(dep.scheduledTime);
    const localDT = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({
      lineNumber: dep.lineNumber,
      destination: dep.destination,
      scheduledTime: localDT,
      platform: dep.platform || '',
      totalSeats: dep.totalSeats,
      agentName: dep.agentName || '',
      agentPhone: dep.agentPhone || '',
    });
    setEditTarget(dep);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/busgo/trajets/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'edit', ...editForm }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Trajet modifié !');
      setEditOpen(false);
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    } finally {
      setEditing(false);
    }
  };

  const handleAction = async (dep: Departure, action: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/busgo/trajets/${dep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error('Erreur');
      const labels: Record<string, string> = {
        'cancel': 'Trajet annulé',
        'delay': `Retard de ${extra?.delayMinutes || 15}min signalé`,
        'start-boarding': 'Embarquement démarré',
        'depart': 'Départ confirmé',
      };
      toast.success(labels[action] || 'Action effectuée');
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/busgo/trajets/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Trajet supprimé');
      setDeleteTarget(null);
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes trajets</h1>
          <p className="text-muted-foreground">Créez et gérez vos départs de bus.</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un trajet
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {departures.length} trajet{departures.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm mb-4">Aucun trajet créé.</p>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier trajet
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {departures.map((departure) => {
                const statusInfo = STATUS_LABELS[departure.status] || { label: departure.status, variant: 'outline' as const };
                return (
                  <div
                    key={departure.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">Ligne {departure.lineNumber} → {departure.destination}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(departure.scheduledTime).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {departure.platform && <span className="text-xs text-muted-foreground">Quai {departure.platform}</span>}
                          <span className="text-xs text-muted-foreground">{departure.availableSeats}/{departure.totalSeats} places</span>
                          {departure.agentPhone && (
                            <span className="text-xs text-amber-600 flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" /> {departure.agentName || 'Agent'}
                            </span>
                          )}
                          {departure.delayMinutes > 0 && (
                            <span className="text-xs text-rose-600">+{departure.delayMinutes}min retard</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusInfo.variant} className="capitalize">{statusInfo.label}</Badge>
                      <Link href={`/busgo/embarquement/${departure.id}`}>
                        <Button variant="ghost" size="sm" className="text-amber-600">
                          Embarquer
                        </Button>
                      </Link>
                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(departure)}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          {departure.status === 'SCHEDULED' && (
                            <DropdownMenuItem onClick={() => handleAction(departure, 'start-boarding')}>
                              <Clock className="h-4 w-4 mr-2" /> Démarrer embarquement
                            </DropdownMenuItem>
                          )}
                          {(departure.status === 'SCHEDULED' || departure.status === 'BOARDING') && (
                            <DropdownMenuItem onClick={() => handleAction(departure, 'delay', { delayMinutes: 15 })}>
                              <AlertTriangle className="h-4 w-4 mr-2" /> Retard +15min
                            </DropdownMenuItem>
                          )}
                          {(departure.status === 'BOARDING' || departure.status === 'DELAYED') && (
                            <DropdownMenuItem onClick={() => handleAction(departure, 'depart')}>
                              <Bus className="h-4 w-4 mr-2" /> Confirmer départ
                            </DropdownMenuItem>
                          )}
                          {departure.status !== 'CANCELLED' && departure.status !== 'DEPARTED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleAction(departure, 'cancel')}
                                className="text-rose-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Annuler
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(departure)}
                            className="text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Créer */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un trajet</DialogTitle>
            <DialogDescription>Configurez un nouveau départ de bus.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lineNumber">Numéro de ligne *</Label>
                <Input id="lineNumber" required placeholder="Ex: Ligne 1" value={form.lineNumber} onChange={(e) => setForm({ ...form, lineNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" required placeholder="Ex: Saint-Louis" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Date et heure *</Label>
                <Input id="scheduledTime" type="datetime-local" required value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Quai</Label>
                <Input id="platform" placeholder="Ex: A1" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSeats">Nombre de sièges</Label>
              <Input id="totalSeats" type="number" min="1" max="200" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 45 })} />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Agent assigné (optionnel)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="agentName" className="flex items-center gap-1"><User className="h-3 w-3" /> Nom agent</Label>
                  <Input id="agentName" placeholder="Ex: Moussa Sow" value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentPhone" className="flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone agent</Label>
                  <Input id="agentPhone" placeholder="Ex: 77 123 45 67" value={form.agentPhone} onChange={(e) => setForm({ ...form, agentPhone: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Ce numéro sera visible par les passagers pour les contacter en cas de retard.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">
                {creating ? 'Création...' : 'Créer le trajet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le trajet</DialogTitle>
            <DialogDescription>Ligne {editTarget?.lineNumber} → {editTarget?.destination}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Numéro de ligne</Label>
                <Input value={editForm.lineNumber} onChange={(e) => setEditForm({ ...editForm, lineNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input value={editForm.destination} onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date et heure</Label>
                <Input type="datetime-local" value={editForm.scheduledTime} onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quai</Label>
                <Input value={editForm.platform} onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sièges</Label>
              <Input type="number" min="1" max="200" value={editForm.totalSeats} onChange={(e) => setEditForm({ ...editForm, totalSeats: parseInt(e.target.value) || 45 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nom agent</Label>
                <Input value={editForm.agentName} onChange={(e) => setEditForm({ ...editForm, agentName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone agent</Label>
                <Input value={editForm.agentPhone} onChange={(e) => setEditForm({ ...editForm, agentPhone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={editing} className="bg-amber-600 hover:bg-amber-700">
                {editing ? 'Modification...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Supprimer */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le trajet ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tous les billets associés seront supprimés.
              <br />
              <strong>Ligne {deleteTarget?.lineNumber} → {deleteTarget?.destination}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700">
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
