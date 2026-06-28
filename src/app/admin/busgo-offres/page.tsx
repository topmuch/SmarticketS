'use client';

/**
 * SuperAdmin — Gestion des Offres Sponsorisées BusGo.
 *
 * CRUD complet + prévisualisation + stats de clics.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, Tag, Eye, BarChart3, X,
  ExternalLink, Smartphone, Bus, Shield, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { OfferCard } from '@/components/busgo/offer-card';

interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  partnerName: string;
  actionUrl: string;
  actionLabel: string;
  targetAudience: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  priority: number;
  clicksCount: number;
}

const AUDIENCE_LABELS: Record<string, { label: string; icon: typeof Bus }> = {
  all: { label: 'Tous', icon: Tag },
  passenger: { label: 'Passagers', icon: Smartphone },
  agent: { label: 'Agents', icon: Bus },
  controller: { label: 'Contrôleurs', icon: Shield },
};

const emptyForm = {
  title: '', description: '', imageUrl: '', videoUrl: '', partnerName: '',
  actionUrl: '', actionLabel: 'Voir', targetAudience: 'all',
  endDate: '', priority: 0,
};

export default function BusGoOffresPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Offer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/busgo-offres', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setOffers(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleSave = async () => {
    if (!form.title || !form.description || !form.partnerName || !form.actionUrl) {
      toast.error('Titre, description, partenaire et lien requis');
      return;
    }
    setSaving(true);
    try {
      const method = editTarget ? 'PATCH' : 'POST';
      const url = editTarget ? `/api/admin/busgo-offres?id=${editTarget.id}` : '/api/admin/busgo-offres';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Erreur');
      toast.success(editTarget ? 'Offre modifiée !' : 'Offre créée !');
      setCreateOpen(false);
      setEditTarget(null);
      setForm(emptyForm);
      fetchOffers();
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (offer: Offer) => {
    setEditTarget(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      imageUrl: offer.imageUrl || '',
      videoUrl: offer.videoUrl || '',
      partnerName: offer.partnerName,
      actionUrl: offer.actionUrl,
      actionLabel: offer.actionLabel,
      targetAudience: offer.targetAudience,
      endDate: offer.endDate ? offer.endDate.slice(0, 10) : '',
      priority: offer.priority,
    });
    setCreateOpen(true);
  };

  const handleToggle = async (offer: Offer) => {
    await fetch(`/api/admin/busgo-offres?id=${offer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !offer.isActive }),
    });
    fetchOffers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/admin/busgo-offres?id=${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    toast.success('Offre supprimée');
    setDeleteTarget(null);
    fetchOffers();
  };

  const totalClicks = offers.reduce((acc, o) => acc + o.clicksCount, 0);
  const activeCount = offers.filter(o => o.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-amber-600" />
            Offres Sponsorisées BusGo
          </h1>
          <p className="text-muted-foreground">Gérez les publicités partenaires affichées dans les PWA.</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => { setEditTarget(null); setForm(emptyForm); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Créer une offre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Tag className="h-5 w-5 text-amber-600 mx-auto mb-1" />
          <div className="font-bold text-lg">{offers.length}</div>
          <div className="text-xs text-muted-foreground">Total offres</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
          <div className="font-bold text-lg">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Actives</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <BarChart3 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
          <div className="font-bold text-lg">{totalClicks}</div>
          <div className="text-xs text-muted-foreground">Clics totaux</div>
        </CardContent></Card>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>
      ) : offers.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Aucune offre sponsorisée.</p>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Créer la première offre
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => {
            const aud = AUDIENCE_LABELS[offer.targetAudience] || AUDIENCE_LABELS.all;
            const AudIcon = aud.icon;
            return (
              <Card key={offer.id} className={!offer.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {offer.imageUrl ? (
                      <img src={offer.imageUrl} alt={offer.partnerName} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Tag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{offer.title}</p>
                        <Badge variant="outline" className="text-xs">
                          <AudIcon className="h-2.5 w-2.5 mr-1" /> {aud.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{offer.partnerName} — {offer.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">Clics: {offer.clicksCount}</span>
                        <span className="text-xs text-muted-foreground">Priorité: {offer.priority}</span>
                        {offer.endDate && (
                          <span className="text-xs text-muted-foreground">Jusqu'au: {new Date(offer.endDate).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={offer.actionUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(offer)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Switch checked={offer.isActive} onCheckedChange={() => handleToggle(offer)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => setDeleteTarget(offer)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier l\'offre' : 'Créer une offre sponsorisée'}</DialogTitle>
            <DialogDescription>Configurez l'affichage de cette offre dans les PWA BusGo.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-1">
              <Label>Titre court *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: -20% sur tous les repas" />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Texte accrocheur" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nom du partenaire *</Label>
                <Input value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} placeholder="Ex: Restaurant Le Baobab" />
              </div>
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/sounds/busgo/... ou URL externe" />
                <p className="text-xs text-muted-foreground">Uploadez via /busgo/voix → utilisez l'URL retournée</p>
              </div>
              <div className="space-y-1">
                <Label>Video URL (MP4)</Label>
                <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="/sounds/busgo/video.mp4 ou URL externe" />
                <p className="text-xs text-muted-foreground">Vidéo optionnelle (remplace l'image si définie)</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Lien d'action *</Label>
                <Input value={form.actionUrl} onChange={(e) => setForm({ ...form, actionUrl: e.target.value })} placeholder="https://wa.me/221..." />
              </div>
              <div className="space-y-1">
                <Label>Libellé du bouton</Label>
                <Input value={form.actionLabel} onChange={(e) => setForm({ ...form, actionLabel: e.target.value })} placeholder="Voir, WhatsApp, Réserver..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Audience cible</Label>
                <Select value={form.targetAudience} onValueChange={(v) => setForm({ ...form, targetAudience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="passenger">Passagers</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                    <SelectItem value="controller">Contrôleurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priorité (0-100)</Label>
                <Input type="number" min="0" max="100" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date de fin (optionnel)</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>

            {/* Preview */}
            {form.title && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Aperçu:</p>
                <OfferCard offer={{
                  id: 'preview', title: form.title, description: form.description,
                  imageUrl: form.imageUrl || null,
                  videoUrl: form.videoUrl || null,
                  partnerName: form.partnerName,
                  actionUrl: form.actionUrl || '#', actionLabel: form.actionLabel,
                  targetAudience: form.targetAudience, priority: form.priority,
                }} />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTarget ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette offre ?</DialogTitle>
            <DialogDescription>{deleteTarget?.title} — {deleteTarget?.partnerName}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
