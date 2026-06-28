'use client';

/**
 * BusGo Paramètres — Configuration agent par départ.
 *
 * Le transporteur peut:
 *   - Assigner un agent (nom + téléphone) à chaque départ
 *   - Le numéro de l'agent sera visible par les passagers dans la PWA
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Phone, Save, Loader2, Bus, MapPin, Clock, Upload, Image as ImageIcon } from 'lucide-react';
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/agency/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const data = await res.json();
      setLogoUrl(data.url);
      toast.success('Logo mis à jour !');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Personnalisez votre compagnie et assignez des agents.</p>
      </div>

      {/* Logo société */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-amber-600" />
            Logo de la société
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover border" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                <Bus className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Logo affiché dans le dashboard et la PWA</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, WebP ou SVG · Max 2MB</p>
            </div>
          </div>
          <Label className="cursor-pointer">
            <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 text-center hover:bg-amber-50 transition-colors">
              {uploadingLogo ? (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Upload...
                </p>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-sm">Uploader un logo</p>
                </>
              )}
            </div>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
            />
          </Label>
        </CardContent>
      </Card>

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
