'use client';

/**
 * BusGo Guichet — Vente de billets.
 *
 * Permet à l'agent de vendre un billet pour un départ donné.
 * Le billet est créé avec un numéro de siège, nom passager, téléphone.
 */

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Loader2, CheckCircle2, Bus, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  availableSeats: number;
  totalSeats: number;
  status: string;
}

export default function BusGoGuichetPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDep, setSelectedDep] = useState<Departure | null>(null);
  const [form, setForm] = useState({ passengerName: '', passengerPhone: '', seatNumber: '' });
  const [selling, setSelling] = useState(false);

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=today', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setDepartures(list.filter((d: Departure) => d.status === 'SCHEDULED' || d.status === 'BOARDING'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

  const handleSell = async () => {
    if (!selectedDep || !form.passengerName || !form.passengerPhone || !form.seatNumber) {
      toast.error('Tous les champs sont requis');
      return;
    }
    setSelling(true);
    try {
      // Use existing ticket sell API or create via busgo endpoint
      const res = await fetch('/api/busgo/guichet/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departureId: selectedDep.id,
          passengerName: form.passengerName,
          passengerPhone: form.passengerPhone,
          seatNumber: form.seatNumber,
          destination: selectedDep.destination,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }

      const data = await res.json();
      toast.success(`Billet vendu ! Siège ${form.seatNumber}`);
      setForm({ passengerName: '', passengerPhone: '', seatNumber: '' });
      fetchDepartures();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guichet</h1>
        <p className="text-muted-foreground">Vendre un billet pour un départ.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Liste des départs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bus className="h-4 w-4 text-amber-600" />
              Départs disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : departures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun départ disponible.
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {departures.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDep(d)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedDep?.id === d.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {new Date(d.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="ml-2 text-sm">{d.lineNumber} → {d.destination}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {d.availableSeats}/{d.totalSeats} places
                      </Badge>
                    </div>
                    {d.platform && (
                      <p className="text-xs text-muted-foreground mt-1">Quai {d.platform}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de vente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-600" />
              {selectedDep ? 'Vendre un billet' : 'Sélectionnez un départ'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDep ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                ← Cliquez sur un départ pour vendre un billet
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-sm font-medium">{selectedDep.lineNumber} → {selectedDep.destination}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedDep.scheduledTime).toLocaleString('fr-FR')}
                    {selectedDep.platform && ` · Quai ${selectedDep.platform}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nom du passager *</Label>
                  <Input
                    id="name"
                    value={form.passengerName}
                    onChange={(e) => setForm({ ...form, passengerName: e.target.value })}
                    placeholder="Ex: Mamadou Diallo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={form.passengerPhone}
                    onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })}
                    placeholder="Ex: 77 123 45 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seat">Numéro de siège *</Label>
                  <Input
                    id="seat"
                    type="number"
                    min="1"
                    max={selectedDep.totalSeats}
                    value={form.seatNumber}
                    onChange={(e) => setForm({ ...form, seatNumber: e.target.value })}
                    placeholder={`1 à ${selectedDep.totalSeats}`}
                  />
                </div>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={handleSell}
                  disabled={selling}
                >
                  {selling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Vendre le billet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
