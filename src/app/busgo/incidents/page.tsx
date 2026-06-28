'use client';

/**
 * BusGo Incidents — Gestion des retards et incidents.
 *
 * Permet à l'agent de:
 *   - Déclarer un retard (10min, 30min, 1h+) → notifie les passagers
 *   - Signaler un problème technique (notifie le SuperAdmin)
 *   - Voir l'historique des incidents
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Clock, Wrench, Send, Loader2, Bus, MapPin,
  History, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  status: string;
  delayMinutes: number;
}

export default function BusGoIncidentsPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDep, setSelectedDep] = useState<string>('');
  const [incidentType, setIncidentType] = useState<'delay' | 'technical' | 'other'>('delay');
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Array<{ type: string; message: string; time: string }>>([]);

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=today', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setDepartures(list.filter((d: Departure) => d.status !== 'DEPARTED' && d.status !== 'CANCELLED'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

  const handleSubmit = async () => {
    if (!selectedDep) {
      toast.error('Sélectionnez un trajet');
      return;
    }
    if (incidentType === 'delay' && !delayMinutes) {
      toast.error('Sélectionnez la durée du retard');
      return;
    }
    if ((incidentType === 'technical' || incidentType === 'other') && !description) {
      toast.error('Décrivez le problème');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/busgo/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departureId: selectedDep,
          type: incidentType,
          delayMinutes: incidentType === 'delay' ? delayMinutes : undefined,
          description: incidentType !== 'delay' ? description : undefined,
        }),
      });

      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();

      toast.success(data.message || 'Incident signalé');

      // Add to history
      const dep = departures.find(d => d.id === selectedDep);
      setHistory(prev => [{
        type: incidentType,
        message: data.message || 'Incident signalé',
        time: new Date().toLocaleString('fr-FR'),
      }, ...prev]);

      // Reset
      setDescription('');
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidents & Retards</h1>
        <p className="text-muted-foreground">Déclarez un retard ou signalez un problème technique.</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Déclarer un incident
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trajet */}
          <div className="space-y-2">
            <Label>Trajet concerné *</Label>
            <Select value={selectedDep} onValueChange={setSelectedDep}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez un trajet" /></SelectTrigger>
              <SelectContent>
                {departures.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {new Date(d.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}Ligne {d.lineNumber} → {d.destination}
                    {d.delayMinutes > 0 && ` (+${d.delayMinutes}min)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departures.length === 0 && <p className="text-xs text-muted-foreground">Aucun trajet actif aujourd'hui.</p>}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type d'incident *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={incidentType === 'delay' ? 'default' : 'outline'}
                onClick={() => setIncidentType('delay')}
                className={incidentType === 'delay' ? 'bg-amber-600' : ''}
              >
                <Clock className="h-3 w-3 mr-1" /> Retard
              </Button>
              <Button
                type="button"
                size="sm"
                variant={incidentType === 'technical' ? 'default' : 'outline'}
                onClick={() => setIncidentType('technical')}
                className={incidentType === 'technical' ? 'bg-rose-600' : ''}
              >
                <Wrench className="h-3 w-3 mr-1" /> Technique
              </Button>
              <Button
                type="button"
                size="sm"
                variant={incidentType === 'other' ? 'default' : 'outline'}
                onClick={() => setIncidentType('other')}
                className={incidentType === 'other' ? 'bg-blue-600' : ''}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Autre
              </Button>
            </div>
          </div>

          {/* Retard duration */}
          {incidentType === 'delay' && (
            <div className="space-y-2">
              <Label>Durée du retard *</Label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 30, 60].map(min => (
                  <Button
                    key={min}
                    type="button"
                    size="sm"
                    variant={delayMinutes === min ? 'default' : 'outline'}
                    onClick={() => setDelayMinutes(min)}
                    className={delayMinutes === min ? 'bg-amber-600' : ''}
                  >
                    +{min}min
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Une notification sera envoyée automatiquement à tous les passagers.</p>
            </div>
          )}

          {/* Description */}
          {(incidentType === 'technical' || incidentType === 'other') && (
            <div className="space-y-2">
              <Label>Description du problème *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Ex: Climatisation en panne, pneu crevé, problème moteur..."
              />
              <p className="text-xs text-muted-foreground">Le SuperAdmin sera notifié automatiquement.</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedDep}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {incidentType === 'delay' ? `Déclarer retard de ${delayMinutes}min` : 'Signaler l\'incident'}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Historique ({history.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                  {h.type === 'delay' ? <Clock className="h-4 w-4 text-amber-600" /> : <Wrench className="h-4 w-4 text-rose-600" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{h.message}</p>
                    <p className="text-xs text-muted-foreground">{h.time}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {h.type === 'delay' ? 'Retard' : h.type === 'technical' ? 'Technique' : 'Autre'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
