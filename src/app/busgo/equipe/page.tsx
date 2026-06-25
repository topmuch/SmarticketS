'use client';

/**
 * BusGo Équipe — Gestion des utilisateurs (guichetier + contrôleur).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Loader2, Shield, Ticket, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  phone: string | null;
}

const ROLE_INFO: Record<string, { label: string; icon: typeof Ticket; color: string }> = {
  agent: { label: 'Guichetier', icon: Ticket, color: 'text-amber-600' },
  controller: { label: 'Contrôleur', icon: Shield, color: 'text-emerald-600' },
  admin: { label: 'Admin', icon: Users, color: 'text-blue-600' },
};

export default function BusGoEquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'agent' });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/equipe', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Nom, email et mot de passe requis');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/busgo/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      setCreatedCreds({ email: form.email, password: form.password });
      toast.success('Compte créé !');
      setCreateOpen(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'agent' });
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/busgo/equipe?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchMembers();
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
          <p className="text-muted-foreground">Créez des comptes guichetier et contrôleur.</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-600 text-white rounded-lg p-2"><Ticket className="h-6 w-6" /></div>
            <div><p className="font-medium">Guichetier</p><p className="text-xs text-muted-foreground">Vend des billets au guichet</p></div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-600 text-white rounded-lg p-2"><Shield className="h-6 w-6" /></div>
            <div><p className="font-medium">Contrôleur</p><p className="text-xs text-muted-foreground">Vérifie les billets dans le bus</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />{members.length} membre{members.length > 1 ? 's' : ''}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : members.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Aucun membre. Cliquez "Ajouter".</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const roleInfo = ROLE_INFO[m.role] || { label: m.role, icon: Users, color: 'text-gray-600' };
                const Icon = roleInfo.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`bg-muted rounded-lg p-2 ${roleInfo.color}`}><Icon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{roleInfo.label}</Badge>
                    <Badge variant={m.isActive ? 'default' : 'destructive'} className="text-xs">{m.isActive ? 'Actif' : 'Inactif'}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(m.id, m.isActive)}>
                      {m.isActive ? <XCircle className="h-4 w-4 text-rose-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle><DialogDescription>Créez un compte guichetier ou contrôleur.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <div className="space-y-2">
              <Label>Rôle *</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={form.role === 'agent' ? 'default' : 'outline'} onClick={() => setForm({ ...form, role: 'agent' })} className={form.role === 'agent' ? 'bg-amber-600' : ''}>
                  <Ticket className="h-3 w-3 mr-1" /> Guichetier
                </Button>
                <Button type="button" size="sm" variant={form.role === 'controller' ? 'default' : 'outline'} onClick={() => setForm({ ...form, role: 'controller' })} className={form.role === 'controller' ? 'bg-emerald-600' : ''}>
                  <Shield className="h-3 w-3 mr-1" /> Contrôleur
                </Button>
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="name">Nom *</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Moussa Sow" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 77 123 45 67" /></div>
            <div className="space-y-2"><Label htmlFor="password">Mot de passe *</Label><Input id="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 caractères" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">{creating ? 'Création...' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCreds} onOpenChange={(open) => !open && setCreatedCreds(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Compte créé !</DialogTitle><DialogDescription>Partagez ces identifiants.</DialogDescription></DialogHeader>
          {createdCreds && (
            <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-mono text-sm font-medium">{createdCreds.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Mot de passe</p><p className="font-mono text-sm font-medium text-amber-700">{createdCreds.password}</p></div>
            </div>
          )}
          <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setCreatedCreds(null)}>Fermer</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
