'use client';

/**
 * BusGo Paramètres — Configuration agent par départ.
 *
 * Le transporteur peut:
 *   - Assigner un agent (nom + téléphone) à chaque départ
 *   - Le numéro de l'agent sera visible par les passagers dans la PWA
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Phone, Save, Loader2, Bus, MapPin, Clock } from 'lucide-react';
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
  agentName: string | null;
  agentPhone: string | null;
  status: string;
}

export default function BusGoParametresPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { agentName: string; agentPhone: string }>>({});

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=upcoming', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setDepartures(list);
      // Initialize edits
      const editMap: Record<string, { agentName: string; agentPhone: string }> = {};
      list.forEach((d: Departure) => {
        editMap[d.id] = {
          agentName: d.agentName || '',
          agentPhone: d.agentPhone || '',
        };
      });
      setEdits(editMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

  const handleSave = async (departureId: string) => {
    const edit = edits[departureId];
    if (!edit) return;
    setSaving(departureId);
    try {
      const res = await fetch(`/api/busgo/trajets/${departureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'set-agent',
          agentName: edit.agentName,
          agentPhone: edit.agentPhone,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Agent configuré');
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Assignez un agent à chaque départ.</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium mb-1">📱 Numéro de l'agent</p>
        <p>Le numéro de téléphone de l'agent sera visible par les passagers dans la PWA.
        Les passagers pourront l'appeler directement en cas de retard.</p>
      </div>

      {departures.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun départ à venir.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {departures.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      Ligne {d.lineNumber} → {d.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.scheduledTime).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{d.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <User className="h-3 w-3" /> Nom agent
                    </Label>
                    <Input
                      value={edits[d.id]?.agentName || ''}
                      onChange={(e) => setEdits({
                        ...edits,
                        [d.id]: { ...edits[d.id], agentName: e.target.value },
                      })}
                      placeholder="Ex: Moussa Sow"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Téléphone agent
                    </Label>
                    <Input
                      value={edits[d.id]?.agentPhone || ''}
                      onChange={(e) => setEdits({
                        ...edits,
                        [d.id]: { ...edits[d.id], agentPhone: e.target.value },
                      })}
                      placeholder="Ex: 77 123 45 67"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSave(d.id)}
                  disabled={saving === d.id}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {saving === d.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Enregistrer l'agent
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
