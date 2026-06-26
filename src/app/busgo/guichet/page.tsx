'use client';

/**
 * BusGo Guichet — Vente de billets avec ticket papier.
 */

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Loader2, Bus, MapPin, QrCode, CheckCircle2, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusGoGuichetOnboarding } from '@/components/busgo/guichet-onboarding';
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
  const [form, setForm] = useState({ paperTicketNumber: '', passengerName: '', passengerPhone: '', seatNumber: '' });
  const [selling, setSelling] = useState(false);
  const [qrResult, setQrResult] = useState<{ qrData: string; installUrl: string; ticket: { passengerName: string; seatNumber: string; controlCode: string; paperTicketNumber: string } } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('busgo_guichet_seen');
      if (!seen) {
        const timer = setTimeout(() => setShowOnboarding(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem('busgo_guichet_seen', 'true');
    setShowOnboarding(false);
  };

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=all', { credentials: 'include' });
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
    if (!selectedDep || !form.paperTicketNumber || !form.passengerName || !form.passengerPhone || !form.seatNumber) {
      toast.error('Tous les champs sont requis');
      return;
    }
    setSelling(true);
    setQrResult(null);
    try {
      const res = await fetch('/api/busgo/guichet/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departureId: selectedDep.id,
          paperTicketNumber: form.paperTicketNumber,
          passengerName: form.passengerName,
          passengerPhone: form.passengerPhone,
          seatNumber: form.seatNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }

      const data = await res.json();
      setQrResult(data);
      toast.success(`Billet vendu ! Siège ${form.seatNumber}`);
      setForm({ paperTicketNumber: '', passengerName: '', passengerPhone: '', seatNumber: '' });
      fetchDepartures();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSelling(false);
    }
  };

  const copyInstallUrl = () => {
    if (!qrResult) return;
    const url = `${window.location.origin}${qrResult.installUrl}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien d\'installation copié !');
  };

  return (
    <div className="space-y-6">
      <BusGoGuichetOnboarding open={showOnboarding} onDismiss={dismissOnboarding} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guichet</h1>
        <p className="text-muted-foreground">Vendez un billet à partir d'un ticket papier.</p>
      </div>

      {/* QR Result (affiché après vente) */}
      {qrResult && (
        <Card className="border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Billet vendu — QR code généré
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-xl border-2 border-emerald-200 text-center">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}${qrResult.installUrl}`}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <p className="text-sm font-medium mt-3">{qrResult.ticket.passengerName} — Siège {qrResult.ticket.seatNumber}</p>
              <p className="text-xs text-muted-foreground font-mono">Ticket papier: {qrResult.ticket.paperTicketNumber}</p>
              <p className="text-xs text-muted-foreground font-mono">Code: {qrResult.ticket.controlCode}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">📱 Faites scanner ce QR par le passager</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Le passager scanne le QR → la PWA s'installe sur son téléphone → il reçoit les notifications vocales.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyInstallUrl}>
                <Copy className="h-4 w-4 mr-2" /> Copier le lien
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => setQrResult(null)}>
                Vendre un autre billet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!qrResult && (
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
                <div className="text-center py-6">
                  <Bus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Aucun départ disponible.</p>
                  <a href="/busgo/trajets" className="text-amber-600 hover:underline text-sm font-medium">
                    → Créer un trajet
                  </a>
                </div>
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
                        <Badge variant="outline" className="text-xs">{d.availableSeats}/{d.totalSeats}</Badge>
                      </div>
                      {d.platform && <p className="text-xs text-muted-foreground mt-1">Quai {d.platform}</p>}
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
                    <Label htmlFor="paperTicket">N° ticket papier *</Label>
                    <Input id="paperTicket" required placeholder="Ex: 12365" value={form.paperTicketNumber} onChange={(e) => setForm({ ...form, paperTicketNumber: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Référence imprimée sur le ticket pré-imprimé</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du passager *</Label>
                    <Input id="name" required placeholder="Ex: Mamadou Diallo" value={form.passengerName} onChange={(e) => setForm({ ...form, passengerName: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input id="phone" required placeholder="Ex: 77 123 45 67" value={form.passengerPhone} onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seat">N° de siège *</Label>
                    <Input id="seat" type="number" min="1" max={selectedDep.totalSeats} required placeholder={`1 à ${selectedDep.totalSeats}`} value={form.seatNumber} onChange={(e) => setForm({ ...form, seatNumber: e.target.value })} />
                  </div>

                  <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleSell} disabled={selling}>
                    {selling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Vendre le billet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
