'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAgency } from '@/app/agence/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { maskPhone, buildOnboardingWaLink } from '@/lib/whatsapp';
import { Users, UserPlus, Phone, MessageCircle, Edit, Trash2, Shield, Check, Loader2, Clock, X, Power, Search, Copy } from 'lucide-react';

const ROLES = { ADMIN: 'ADMIN', OPERATOR: 'OPERATOR', CONTROLLER: 'CONTROLLER', DRIVER: 'DRIVER' };
const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrateur', OPERATOR: 'Opérateur', CONTROLLER: 'Contrôleur', DRIVER: 'Chauffeur' };
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['VIEW_REPORTS', 'MANAGE_STAFF', 'ACTIVATE_TICKETS', 'ACTIVATE_PARCELS', 'VALIDATE_TICKETS', 'MANAGE_DELIVERIES', 'VIEW_ANALYTICS'],
  OPERATOR: ['ACTIVATE_TICKETS', 'ACTIVATE_PARCELS', 'VIEW_ANALYTICS'],
  CONTROLLER: ['VALIDATE_TICKETS'], DRIVER: ['MANAGE_DELIVERIES'],
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  OPERATOR: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  CONTROLLER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  DRIVER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

interface StaffMember { id: string; name: string; phone: string; role: string; permissions: string[]; isActive: boolean; hasActivated: boolean; lastLogin: string | null; createdAt: string; }
const emptyForm = { name: '', phone: '', role: ROLES.OPERATOR, permissions: [...ROLE_PERMISSIONS[ROLES.OPERATOR]] };
type DType = 'add' | 'edit' | 'delete' | 'code' | null;

const STAT_ITEMS = [
  { key: 'total', label: 'Total membres', color: 'text-slate-900 dark:text-slate-100', hasSub: true },
  { key: 'admin', label: 'Administrateurs', color: 'text-rose-600 dark:text-rose-400' },
  { key: 'operator', label: 'Opérateurs', color: 'text-sky-600 dark:text-sky-400' },
  { key: 'controller', label: 'Contrôleurs', color: 'text-amber-600 dark:text-amber-400' },
  { key: 'driver', label: 'Chauffeurs', color: 'text-emerald-600 dark:text-emerald-400' },
] as const;

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-11"><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
      <SelectContent>
        {Object.entries(ROLE_LABELS).map(([r, l]) => (
          <SelectItem key={r} value={r}><Shield className="w-3.5 h-3.5 mr-1.5 inline" />{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function EquipePage() {
  const { agencyId, agencyName } = useAgency();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialog, setDialog] = useState<DType>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<{ staffName: string; phone: string; role: string; code: string } | null>(null);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const pwaUrl = typeof window !== 'undefined' ? `${window.location.origin}/driver/login` : '';

  const fetchStaff = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/agence/staff?agencyId=${agencyId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStaff(data.staff || []);
    } catch { toast.error("Erreur lors du chargement de l'équipe"); }
    finally { setLoading(false); }
  }, [agencyId]);
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const filtered = staff.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const byRole = (r: string) => staff.filter((s) => s.role === r).length;
  const activeCount = staff.filter((s) => s.isActive).length;

  const close = () => { setDialog(null); setSelected(null); };
  const openAdd = () => { setForm({ ...emptyForm }); setDialog('add'); };
  const openEdit = (m: StaffMember) => { setSelected(m); setForm({ name: m.name, phone: m.phone, role: m.role, permissions: [...m.permissions] }); setDialog('edit'); };
  const openDelete = (m: StaffMember) => { setSelected(m); setDialog('delete'); };
  const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleCreate = async () => {
    if (!agencyId || !form.name.trim() || !form.phone.trim()) { toast.error('Remplissez tous les champs'); return; }
    try {
      setSubmitting(true);
      const res = await fetch('/api/agence/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agencyId, name: form.name.trim(), phone: form.phone.trim(), role: form.role, permissions: form.permissions }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur création'); return; }
      toast.success('Membre ajouté !');
      setDialog('code');
      setCreatedCode({ staffName: data.staff.name, phone: data.staff.phone, role: data.staff.role, code: data.plainCode });
      setForm({ ...emptyForm }); fetchStaff();
    } catch { toast.error('Erreur serveur'); } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/agence/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, name: form.name.trim(), role: form.role, permissions: form.permissions }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur modification'); return; }
      toast.success('Membre modifié'); close(); fetchStaff();
    } catch { toast.error('Erreur serveur'); } finally { setSubmitting(false); }
  };

  const handleToggle = async (m: StaffMember) => {
    try {
      const res = await fetch('/api/agence/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, isActive: !m.isActive }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      toast.success(m.isActive ? 'Membre désactivé' : 'Membre réactivé'); fetchStaff();
    } catch { toast.error('Erreur serveur'); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const res = await fetch('/api/agence/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id }) });
      if (!res.ok) { toast.error((await res.json()).error || 'Erreur'); return; }
      toast.success('Membre supprimé'); close(); fetchStaff();
    } catch { toast.error('Erreur serveur'); }
  };

  const sendWhatsApp = (m: StaffMember) => {
    window.open(buildOnboardingWaLink(m.phone, { name: m.name, code: '****', role: ROLE_LABELS[m.role] || m.role, pwaUrl, agencyName }), '_blank', 'noopener,noreferrer');
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    try { await navigator.clipboard.writeText(createdCode.code); setCopied(true); toast.success('Code copié'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Impossible de copier'); }
  };

  const sendCodeWhatsApp = () => {
    if (!createdCode) return;
    window.open(buildOnboardingWaLink(createdCode.phone, { name: createdCode.staffName, code: createdCode.code, role: ROLE_LABELS[createdCode.role] || createdCode.role, pwaUrl, agencyName }), '_blank', 'noopener,noreferrer');
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Jamais';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF1D8D]/10 flex items-center justify-center"><Users className="w-5 h-5 text-[#FF1D8D]" /></div>
            Gestion d&apos;Équipe
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[52px]">Gérez les membres et les rôles de votre équipe terrain</p>
        </div>
        <Button onClick={openAdd} className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white shrink-0"><UserPlus className="w-4 h-4 mr-2" />Ajouter un membre</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_ITEMS.map((s) => (
          <Card key={s.key} className="p-4 hover:shadow-md transition-shadow">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.key === 'total' ? staff.length : byRole(ROLES[s.key.toUpperCase() as keyof typeof ROLES])}</p>
            {s.hasSub && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{activeCount} actifs</p>}
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Rechercher par nom ou téléphone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" /><div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></Card>
          ))}</div>
          <Card className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" /><div className="flex-1 space-y-2"><div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /><div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></div></div>
          ))}</Card>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"><Users className="w-10 h-10 text-slate-300 dark:text-slate-600" /></div>
          <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">{staff.length === 0 ? 'Aucun membre' : 'Aucun résultat'}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{staff.length === 0 ? 'Commencez par ajouter votre premier membre' : 'Essayez un autre terme'}</p>
          {staff.length === 0 && <Button variant="outline" onClick={openAdd} className="mt-4"><UserPlus className="w-4 h-4 mr-2" />Ajouter un membre</Button>}
        </div>
      )}

      {/* Staff Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} className="p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1D8D]/20 to-[#FF1D8D]/5 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-[#FF1D8D]">{initials(m.name)}</span>
                  </div>
                  <div><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.name}</p><p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{maskPhone(m.phone)}</p></div>
                </div>
                <Badge className={`text-xs font-medium border shrink-0 ${ROLE_COLORS[m.role] || ''}`}><Shield className="w-3 h-3 mr-1" />{ROLE_LABELS[m.role] || m.role}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                <div className={`w-2 h-2 rounded-full ${m.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>{m.isActive ? 'Actif' : 'Inactif'}</span>
                <span className={m.hasActivated ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>• {m.hasActivated ? 'Activé' : 'En attente'}</span>
                <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(m.lastLogin)}</span>
              </div>
              <Separator className="mb-3" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(m)} className="flex-1 text-xs h-8"><Edit className="w-3 h-3 mr-1" />Modifier</Button>
                <Button size="sm" variant="outline" onClick={() => sendWhatsApp(m)} className="flex-1 text-xs h-8"><MessageCircle className="w-3 h-3 mr-1" />WhatsApp</Button>
                <Button size="sm" variant="ghost" onClick={() => handleToggle(m)} className="h-8 w-8 p-0" title={m.isActive ? 'Désactiver' : 'Activer'}><Power className={`w-3.5 h-3.5 ${m.isActive ? 'text-slate-400' : 'text-emerald-500'}`} /></Button>
                <Button size="sm" variant="ghost" onClick={() => openDelete(m)} className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog === 'add'} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#FF1D8D]" />Ajouter un membre</DialogTitle>
            <DialogDescription>Créez un nouveau membre. Un code sera généré automatiquement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom complet <span className="text-rose-500">*</span></Label><Input placeholder="Ex: Mamadou Diallo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone <span className="text-rose-500">*</span></Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">+</span><Input placeholder="221 77 123 45 67" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" className="pl-7" /></div></div>
            <div className="space-y-2"><Label>Rôle</Label><RoleSelect value={form.role} onChange={(v) => setForm({ ...form, role: v, permissions: [...ROLE_PERMISSIONS[v]] })} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={close}><X className="w-4 h-4 mr-2" />Annuler</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name.trim() || !form.phone.trim()} className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</> : <><Check className="w-4 h-4 mr-2" />Créer le membre</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialog === 'edit'} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-[#FF1D8D]" />Modifier le membre</DialogTitle>
            <DialogDescription>Modifiez les informations de <span className="font-medium">{selected?.name}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom complet</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"><Phone className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600 dark:text-slate-300">{maskPhone(form.phone)}</span><span className="text-xs text-slate-400 ml-auto">Non modifiable</span></div></div>
            <div className="space-y-2"><Label>Rôle</Label><RoleSelect value={form.role} onChange={(v) => setForm({ ...form, role: v, permissions: [...ROLE_PERMISSIONS[v]] })} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={close}><X className="w-4 h-4 mr-2" />Annuler</Button>
            <Button onClick={handleEdit} disabled={submitting || !form.name.trim()} className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : <><Check className="w-4 h-4 mr-2" />Enregistrer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={dialog === 'code'} onOpenChange={(o) => { if (!o) { close(); setCreatedCode(null); setCodeRevealed(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🔑 Code d&apos;accès généré</DialogTitle>
            <DialogDescription>Ce code ne sera affiché qu&apos;une seule fois.</DialogDescription>
          </DialogHeader>
          {createdCode && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-emerald-600" /></div><div><p className="text-sm font-semibold">{createdCode.staffName}</p><p className="text-xs text-slate-500">{maskPhone(createdCode.phone)}</p></div></div>
                <Badge variant="outline" className="text-xs">{ROLE_LABELS[createdCode.role]}</Badge>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 font-medium">Code :</span>
                <span className="font-mono text-xl font-bold tracking-[0.3em] text-slate-900 dark:text-slate-100">{codeRevealed ? createdCode.code : '****'}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10" onClick={sendCodeWhatsApp}><MessageCircle className="w-4 h-4 mr-2" />Envoyer par WhatsApp</Button>
                <Button variant="outline" className="flex-1 h-10" onClick={handleCopyCode}>{copied ? <><Check className="w-4 h-4 mr-2 text-emerald-500" />Copié !</> : <><Copy className="w-4 h-4 mr-2" />Copier</>}</Button>
              </div>
              <button onClick={() => setCodeRevealed(!codeRevealed)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">{codeRevealed ? 'Masquer le code' : 'Afficher le code'}</button>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => { close(); setCreatedCode(null); setCodeRevealed(false); }}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialog === 'delete'} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Trash2 className="w-5 h-5" />Supprimer le membre</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"><span className="text-sm font-semibold text-rose-600">{initials(selected.name)}</span></div>
                <div><p className="font-medium text-slate-900 dark:text-slate-100">{selected.name}</p><p className="text-sm text-slate-500">{ROLE_LABELS[selected.role]} • {maskPhone(selected.phone)}</p></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={close}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" />Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
