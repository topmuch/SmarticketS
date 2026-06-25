'use client';

/**
 * BusGo Trajets — Liste + Création de trajets.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, MapPin, Loader2, AlertCircle, Bus, Calendar, Plus, User, Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
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
  const [form, setForm] = useState({
    lineNumber: '',
    destination: '',
    scheduledTime: '',
    platform: '',
    totalSeats: 45,
    agentName: '',
    agentPhone: '',
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
      const list = Array.isArray(data) ? data : data.data || [];
      setDepartures(list);
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
                  <Link
                    key={departure.id}
                    href={`/busgo/embarquement/${departure.id}`}
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
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant} className="capitalize">{statusInfo.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Créer un trajet */}
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
    </div>
  );
}
