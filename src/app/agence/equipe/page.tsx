/**
 * Dashboard Équipe — /agence/equipe
 *
 * Complete team management interface:
 * - Staff table with status, role, last login
 * - Add member modal (name, phone, role, permissions)
 * - Reset code action + WhatsApp onboarding
 * - Deactivate/Delete actions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAgency } from '@/app/agence/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Users,
  Phone,
  Shield,
  Clock,
  KeyRound,
  Trash2,
  Power,
  PowerOff,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import WhatsAppOnboarding from '@/components/staff/WhatsAppOnboarding';
import {
  ROLES,
  PERMISSIONS,
  ROLE_LABELS,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
} from '@/lib/rbac';
import { maskPhone } from '@/lib/whatsapp';

// ─── Types ──────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  hasActivated: boolean;
  lastLogin: string | null;
  codeExpiresAt: string | null;
  hasValidCode: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function EquipePage() {
  const { agencyId } = useAgency();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // New member form
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    role: ROLES.OPERATOR,
    permissions: [...DEFAULT_PERMISSIONS[ROLES.OPERATOR]],
  });
  const [creating, setCreating] = useState(false);

  // Code display (after creation or reset)
  const [codeDisplay, setCodeDisplay] = useState<{
    staff: StaffMember;
    code: string;
  } | null>(null);

  // ─── Fetch Staff ─────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/agence/staff?agencyId=${agencyId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Erreur lors du chargement de l\'équipe');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ─── Create Staff ──────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newMember.name.trim() || !newMember.phone.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/agence/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMember.name.trim(),
          phone: newMember.phone.trim(),
          role: newMember.role,
          permissions: newMember.permissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }

      toast.success('Membre ajouté avec succès !');
      setShowAddModal(false);
      setShowCodeModal(true);
      setCodeDisplay({
        staff: data.staff,
        code: data.staff.code,
      });

      // Reset form
      setNewMember({
        name: '',
        phone: '',
        role: ROLES.OPERATOR,
        permissions: [...DEFAULT_PERMISSIONS[ROLES.OPERATOR]],
      });

      fetchStaff();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Erreur serveur');
    } finally {
      setCreating(false);
    }
  };

  // ─── Reset Code ──────────────────────────────────────────────────

  const handleResetCode = async (staffMember: StaffMember) => {
    try {
      const res = await fetch(`/api/agence/staff/${staffMember.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-code' }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la réinitialisation');
        return;
      }

      toast.success('Code réinitialisé');
      setShowCodeModal(true);
      setCodeDisplay({
        staff: { ...staffMember, hasValidCode: true },
        code: data.code,
      });
      fetchStaff();
    } catch (error) {
      console.error('Reset code error:', error);
      toast.error('Erreur serveur');
    }
  };

  // ─── Toggle Active ───────────────────────────────────────────────

  const handleToggleActive = async (staffMember: StaffMember) => {
    try {
      const res = await fetch(`/api/agence/staff/${staffMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staffMember.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }

      toast.success(staffMember.isActive ? 'Membre désactivé' : 'Membre réactivé');
      fetchStaff();
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Erreur serveur');
    }
  };

  // ─── Delete Staff ──────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`/api/agence/staff/${selectedStaff.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }

      toast.success('Membre supprimé');
      setShowDeleteModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur serveur');
    }
  };

  // ─── Permission Toggle ────────────────────────────────────────────

  const togglePermission = (perm: string) => {
    setNewMember((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  // ─── Filtered Staff ──────────────────────────────────────────────

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ─── Role Badge Color ─────────────────────────────────────────────

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case ROLES.OPERATOR:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case ROLES.CONTROLLER:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case ROLES.DRIVER:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return '';
    }
  };

  // ─── PWA URL ──────────────────────────────────────────────────────

  const pwaUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/driver/login`
    : '';

  // ─── Stats ────────────────────────────────────────────────────────

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.isActive).length;
  const byRole = {
    admin: staff.filter((s) => s.role === ROLES.ADMIN).length,
    operator: staff.filter((s) => s.role === ROLES.OPERATOR).length,
    controller: staff.filter((s) => s.role === ROLES.CONTROLLER).length,
    driver: staff.filter((s) => s.role === ROLES.DRIVER).length,
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-[#FF1D8D]" />
            Gestion d'Équipe
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez les membres, les rôles et les permissions de votre équipe terrain
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalStaff}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">{activeStaff} actifs</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Admins</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{byRole.admin}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Opérateurs</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{byRole.operator}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contrôleurs</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{byRole.controller}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chauffeurs</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{byRole.driver}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 pr-8 text-sm appearance-none cursor-pointer"
          >
            <option value="ALL">Tous les rôles</option>
            <option value={ROLES.ADMIN}>Admins</option>
            <option value={ROLES.OPERATOR}>Opérateurs</option>
            <option value={ROLES.CONTROLLER}>Contrôleurs</option>
            <option value={ROLES.DRIVER}>Chauffeurs</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500">Chargement de l'équipe...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {staff.length === 0
                ? 'Aucun membre dans votre équipe'
                : 'Aucun résultat trouvé'}
            </p>
            {staff.length === 0 && (
              <Button
                variant="outline"
                onClick={() => setShowAddModal(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter votre premier membre
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full hidden md:table">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Membre</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Téléphone</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Rôle</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Dernière connexion</th>
                  <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF1D8D]/20 to-[#FF1D8D]/5 flex items-center justify-center">
                          <span className="text-sm font-semibold text-[#FF1D8D]">
                            {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {member.hasActivated ? (
                              <span className="text-green-600 dark:text-green-400">✓ Activé</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">En attente</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {maskPhone(member.phone)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs font-medium border-0 ${getRoleBadgeVariant(member.role)}`}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {member.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'Jamais'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleResetCode(member)} title="Réinitialiser le code">
                          <KeyRound className="w-4 h-4 text-amber-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(member)} title={member.isActive ? 'Désactiver' : 'Réactiver'}>
                          {member.isActive ? <PowerOff className="w-4 h-4 text-slate-400" /> : <Power className="w-4 h-4 text-green-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(member); setShowDeleteModal(true); }} title="Supprimer">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {filteredStaff.map((member) => (
                <div key={member.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1D8D]/20 to-[#FF1D8D]/5 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#FF1D8D]">
                          {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {maskPhone(member.phone)}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs font-medium border-0 ${getRoleBadgeVariant(member.role)}`}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                    {member.isActive ? 'Actif' : 'Inactif'}
                    <span className="mx-1">•</span>
                    <Clock className="w-3 h-3" />
                    {member.lastLogin
                      ? new Date(member.lastLogin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                      : 'Jamais connecté'}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => handleResetCode(member)} className="flex-1 text-xs">
                      <KeyRound className="w-3 h-3 mr-1" /> Code
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(member)} className="flex-1 text-xs">
                      {member.isActive ? <><PowerOff className="w-3 h-3 mr-1" /> Désactiver</> : <><Power className="w-3 h-3 mr-1" /> Réactiver</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(member); setShowDeleteModal(true); }}>
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Member Modal ──────────────────────────────────────── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#FF1D8D]" />
              Ajouter un membre
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau membre d'équipe. Un code d'accès sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nom complet <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ex: Mamadou Diallo"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Téléphone <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ex: +221 77 123 45 67"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                type="tel"
              />
              <p className="text-xs text-slate-500">Format E.164 (ex: +221771234567)</p>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rôle</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <button
                    key={role}
                    onClick={() => {
                      const r = role;
                      setNewMember({
                        ...newMember,
                        role: r,
                        permissions: [...DEFAULT_PERMISSIONS[r]],
                      });
                    }}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${newMember.role === role
                        ? 'border-[#FF1D8D] bg-[#FF1D8D]/5 text-[#FF1D8D]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}
                    `}
                  >
                    <Shield className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Permissions</label>
              <p className="text-xs text-slate-500">Modifiées automatiquement selon le rôle sélectionné.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                  <label
                    key={perm}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm
                      ${newMember.permissions.includes(perm)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={newMember.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      newMember.permissions.includes(perm)
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {newMember.permissions.includes(perm) && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newMember.name.trim() || !newMember.phone.trim()}
              className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" /> Créer le membre</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Code Display Modal ───────────────────────────────────── */}
      <Dialog open={showCodeModal && !!codeDisplay} onOpenChange={(open) => {
        setShowCodeModal(open);
        if (!open) setCodeDisplay(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Code d'accès généré
            </DialogTitle>
            <DialogDescription>
              Ce code ne sera affiché qu'une seule fois. Envoyez-le au membre via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {codeDisplay && (
            <WhatsAppOnboarding
              name={codeDisplay.staff.name}
              phone={codeDisplay.staff.phone}
              role={codeDisplay.staff.role}
              code={codeDisplay.code}
              pwaUrl={pwaUrl}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Modal ─────────────────────────────── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Supprimer le membre
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le membre sera désactivé et ses accès supprimés.
            </DialogDescription>
          </DialogHeader>

          {selectedStaff && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-rose-600">
                    {selectedStaff.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedStaff.name}</p>
                  <p className="text-sm text-slate-500">{ROLE_LABELS[selectedStaff.role]} • {maskPhone(selectedStaff.phone)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
