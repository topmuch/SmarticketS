'use client';

/**
 * SuperAdmin — Gestion des compagnies BusGo.
 *
 * Page: /admin/busgo-compagnies
 *
 * Permet au SuperAdmin de:
 *   - Voir toutes les compagnies BusGo
 *   - Créer une nouvelle compagnie (génère identifiants)
 *   - Voir les identifiants générés (mot de passe affiché une seule fois)
 *   - Copier les identifiants
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Building2,
  Users,
  Ticket,
  Bus,
  Loader2,
  CheckCircle2,
  Copy,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Compagnie {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  adminUser: { id: string; email: string; name: string | null; isActive: boolean } | null;
  usersCount: number;
  departuresCount: number;
  ticketsCount: number;
}

interface CreatedCompagnie {
  compagnie: { id: string; name: string; slug: string; email: string | null };
  admin: { id: string; email: string; name: string };
  generatedPassword: string;
  busgoUrl: string;
}

export default function BusGoCompagniesPage() {
  const [compagnies, setCompagnies] = useState<Compagnie[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCompagnie | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    adminName: '',
    adminEmail: '',
  });

  const fetchCompagnies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/busgo-compagnies', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setCompagnies(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompagnies(); }, [fetchCompagnies]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/busgo-compagnies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }

      const data = await res.json();
      setCredentials(data);
      setCreateOpen(false);
      setForm({ name: '', slug: '', email: '', phone: '', adminName: '', adminEmail: '' });
      toast.success('Compagnie BusGo créée !');
      fetchCompagnies();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Compagnie: ${credentials.compagnie.name}
URL BusGo: ${credentials.busgoUrl}
Email admin: ${credentials.admin.email}
Mot de passe: ${credentials.generatedPassword}`;
    navigator.clipboard.writeText(text);
    toast.success('Identifiants copiés !');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bus className="h-6 w-6 text-amber-600" />
            Compagnies BusGo
          </h1>
          <p className="text-muted-foreground">
            Créez des compagnies de transport qui utilisent BusGo.
          </p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Créer une compagnie
        </Button>
      </div>

      {/* Liste des compagnies */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : compagnies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Aucune compagnie BusGo créée.</p>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer la première compagnie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {compagnies.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2">
                      <Building2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.slug}</p>
                    </div>
                  </div>
                  <Badge variant={c.active ? 'default' : 'destructive'} className="text-xs">
                    {c.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <Users className="h-3 w-3 mx-auto mb-1 text-blue-600" />
                    <div className="font-bold">{c.usersCount}</div>
                    <div className="text-muted-foreground">users</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <Bus className="h-3 w-3 mx-auto mb-1 text-amber-600" />
                    <div className="font-bold">{c.departuresCount}</div>
                    <div className="text-muted-foreground">départs</div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <Ticket className="h-3 w-3 mx-auto mb-1 text-emerald-600" />
                    <div className="font-bold">{c.ticketsCount}</div>
                    <div className="text-muted-foreground">billets</div>
                  </div>
                </div>

                {c.adminUser && (
                  <div className="mt-3 pt-3 border-t text-xs">
                    <p className="text-muted-foreground">Admin:</p>
                    <p className="font-medium">{c.adminUser.name} ({c.adminUser.email})</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Créer une compagnie */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une compagnie BusGo</DialogTitle>
            <DialogDescription>
              La compagnie aura accès à l&apos;espace BusGo (/busgo) avec ses propres identifiants.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la compagnie *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Ex: dakar-express</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email compagnie</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Administrateur de la compagnie</p>
              <div className="space-y-2">
                <Label htmlFor="adminName">Nom de l&apos;admin *</Label>
                <Input
                  id="adminName"
                  required
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="adminEmail">Email admin *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Un mot de passe aléatoire sera généré automatiquement.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">
                {creating ? 'Création...' : 'Créer la compagnie'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Identifiants générés */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Compagnie créée avec succès !
            </DialogTitle>
            <DialogDescription>
              Partagez ces identifiants avec l&apos;administrateur de la compagnie.
              Le mot de passe ne sera plus affiché.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Compagnie</p>
                  <p className="font-medium">{credentials.compagnie.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">URL BusGo</p>
                  <p className="font-mono text-sm">{credentials.busgoUrl}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email admin</p>
                  <p className="font-mono text-sm font-medium">{credentials.admin.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mot de passe généré</p>
                  <p className="font-mono text-sm font-medium text-amber-700 dark:text-amber-300">
                    {credentials.generatedPassword}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  L&apos;admin peut se connecter sur /login puis accéder à /busgo.
                  Le mot de passe ne sera plus affiché — copiez-le maintenant.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyCredentials}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier les identifiants
                </Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => setCredentials(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
