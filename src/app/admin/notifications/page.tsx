'use client';

import AdminLayout from '@/components/admin/NewAdminLayout';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  Bell,
  Volume2,
  Send,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  Megaphone,
  Clock,
} from 'lucide-react';
import { playDingDong, speakFrench } from '@/lib/audioSystem';
import { AnnouncementPriority } from '@/lib/audioSystem';

// ── Types ──────────────────────────────────────────────────
interface NotificationTemplate {
  id: string;
  name: string;
  type: 'BOARDING' | 'IMMINENT' | 'DELAY' | 'DEPARTED' | 'CANCELLED' | 'CLIENT_CALL' | 'DRIVER_CALL' | 'SECURITY' | 'GENERAL';
  text: string;
  priority: 'P1_URGENT' | 'P2_HIGH' | 'P3_NORMAL' | 'P4_LOW';
  isAuto: boolean;
  isActive: boolean;
  lastSentAt?: string;
  sendCount: number;
}

interface NewTemplateForm {
  name: string;
  type: NotificationTemplate['type'];
  text: string;
  priority: NotificationTemplate['priority'];
}

interface SendModalState {
  open: boolean;
  template: NotificationTemplate | null;
  nom: string;
  guichet: string;
}

interface EditModalState {
  open: boolean;
  template: NotificationTemplate | null;
  editText: string;
}

// ── Default Templates ──────────────────────────────────────
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Embarquement',
    type: 'BOARDING',
    text: "Madame, Monsieur, le bus à destination de {DESTINATION} est en cours d'embarquement. Quai {QUAI}. Le bus va partir à {HEURE}.",
    priority: 'P3_NORMAL',
    isAuto: true,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '2',
    name: 'Départ imminent',
    type: 'IMMINENT',
    text: "Madame, Monsieur, attention. Le bus à destination de {DESTINATION} va partir dans deux minutes. Merci de monter à bord immédiatement.",
    priority: 'P3_NORMAL',
    isAuto: true,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '3',
    name: 'Retard',
    type: 'DELAY',
    text: 'Madame, Monsieur, le bus en direction de {DESTINATION} est en retard de {MINUTES} minutes, merci de patienter.',
    priority: 'P3_NORMAL',
    isAuto: true,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '4',
    name: 'Appel Client',
    type: 'CLIENT_CALL',
    text: 'Madame, Monsieur, nous appelons {NOM} au guichet {QUAI}. Merci de vous présenter.',
    priority: 'P2_HIGH',
    isAuto: false,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '5',
    name: 'Appel Chauffeur',
    type: 'DRIVER_CALL',
    text: 'Madame, Monsieur, nous appelons le chauffeur {NOM} au quai {QUAI}. Merci de vous présenter.',
    priority: 'P2_HIGH',
    isAuto: false,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '6',
    name: 'Alerte Sécurité',
    type: 'SECURITY',
    text: 'Madame, Monsieur, attention, veuillez évacuer la zone. Suivez les instructions du personnel.',
    priority: 'P1_URGENT',
    isAuto: false,
    isActive: true,
    sendCount: 0,
  },
  {
    id: '7',
    name: 'Message Général',
    type: 'GENERAL',
    text: 'Madame, Monsieur, bienvenue à la gare. Merci de voyager avec nous.',
    priority: 'P4_LOW',
    isAuto: false,
    isActive: true,
    sendCount: 0,
  },
];

// ── Helpers ────────────────────────────────────────────────

const TYPE_LABELS: Record<NotificationTemplate['type'], string> = {
  BOARDING: 'Embarquement',
  IMMINENT: 'Départ imminent',
  DELAY: 'Retard',
  DEPARTED: 'Départ effectué',
  CANCELLED: 'Annulé',
  CLIENT_CALL: 'Appel Client',
  DRIVER_CALL: 'Appel Chauffeur',
  SECURITY: 'Sécurité',
  GENERAL: 'Général',
};

const PRIORITY_CONFIG: Record<NotificationTemplate['priority'], { label: string; color: string }> = {
  P1_URGENT: { label: 'P1 Urgent', color: 'bg-red-100 text-red-700 hover:bg-red-100' },
  P2_HIGH: { label: 'P2 Haut', color: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  P3_NORMAL: { label: 'P3 Normal', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  P4_LOW: { label: 'P4 Bas', color: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
};

const priorityMap: Record<NotificationTemplate['priority'], number> = {
  P1_URGENT: AnnouncementPriority.CRITICAL,
  P2_HIGH: AnnouncementPriority.HIGH,
  P3_NORMAL: AnnouncementPriority.MEDIUM,
  P4_LOW: AnnouncementPriority.LOW,
};

const emptyNewForm: NewTemplateForm = {
  name: '',
  type: 'GENERAL',
  text: '',
  priority: 'P4_LOW',
};

// ── Component ──────────────────────────────────────────────
export default function NotificationsPage() {
  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(false);

  // Test state (for local playback)
  const [testing, setTesting] = useState<string | null>(null);

  // Send modal (for CLIENT_CALL and DRIVER_CALL)
  const [sendModal, setSendModal] = useState<SendModalState>({
    open: false,
    template: null,
    nom: '',
    guichet: '',
  });
  const [sending, setSending] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    template: null,
    editText: '',
  });

  // New template modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewTemplateForm>(emptyNewForm);

  // WebSocket
  const socketRef = useRef<Socket | null>(null);

  // ── WebSocket connection to kiosk-service (port 3004) ──
  useEffect(() => {
    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;
    socket.on('connect', () => {
      // connected to kiosk-service
    });
    socket.on('disconnect', () => {
      // disconnected from kiosk-service
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Resolve template text with variables ──────────────
  const resolveText = useCallback(
    (template: NotificationTemplate, vars?: { DESTINATION?: string; NOM?: string; QUAI?: string; MINUTES?: string; HEURE?: string }) => {
      let resolved = template.text;
      if (vars) {
        resolved = resolved.replace(/\{DESTINATION\}/g, vars.DESTINATION || '???');
        resolved = resolved.replace(/\{NOM\}/g, vars.NOM || '???');
        resolved = resolved.replace(/\{QUAI\}/g, vars.QUAI || '???');
        resolved = resolved.replace(/\{MINUTES\}/g, vars.MINUTES || '???');
        resolved = resolved.replace(/\{HEURE\}/g, vars.HEURE || '???');
      }
      return resolved;
    },
    [],
  );

  // ── Handle Test (local playback) ──────────────────────
  const handleTest = useCallback(async (template: NotificationTemplate) => {
    setTesting(template.id);
    try {
      playDingDong();
      await new Promise((r) => setTimeout(r, 3000));
      await speakFrench(template.text);
      toast.success(`Test réussi : "${template.name}"`);
    } catch {
      toast.error(`Erreur lors du test de "${template.name}"`);
    } finally {
      setTesting(null);
    }
  }, []);

  // ── Handle Send (for manual templates) ────────────────
  const handleSendClick = useCallback((template: NotificationTemplate) => {
    if (template.type === 'CLIENT_CALL' || template.type === 'DRIVER_CALL') {
      // Open modal to collect variables
      setSendModal({ open: true, template, nom: '', guichet: '' });
    } else {
      // SECURITY and GENERAL — send directly
      handleDirectSend(template);
    }
  }, []);

  const handleDirectSend = useCallback((template: NotificationTemplate) => {
    if (!socketRef.current?.connected) {
      toast.error('Non connecté au service kiosk');
      return;
    }

    const resolvedText = template.text;

    socketRef.current.emit('kiosk:manualAnnounce', {
      text: resolvedText,
      priority: priorityMap[template.priority],
      type: template.type,
      stationSlug: '*',
    });

    // Update template locally
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id
          ? { ...t, lastSentAt: new Date().toISOString(), sendCount: t.sendCount + 1 }
          : t,
      ),
    );

    toast.success(`Notification "${template.name}" envoyée à tous les kiosques`);
  }, []);

  const handleSendSubmit = useCallback(() => {
    if (!sendModal.template) return;

    const { template, nom, guichet } = sendModal;

    if (!nom.trim() || !guichet.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!socketRef.current?.connected) {
      toast.error('Non connecté au service kiosk');
      return;
    }

    const resolvedText = resolveText(template, {
      NOM: nom.trim(),
      QUAI: guichet.trim(),
    });

    setSending(true);

    socketRef.current.emit('kiosk:manualAnnounce', {
      text: resolvedText,
      priority: priorityMap[template.priority],
      type: template.type,
      stationSlug: '*',
    });

    // Update template locally
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id
          ? { ...t, lastSentAt: new Date().toISOString(), sendCount: t.sendCount + 1 }
          : t,
      ),
    );

    toast.success(`Notification "${template.name}" envoyée à tous les kiosques`);
    setSendModal({ open: false, template: null, nom: '', guichet: '' });
    setSending(false);
  }, [sendModal, resolveText]);

  // ── Handle Edit ───────────────────────────────────────
  const handleEditOpen = useCallback((template: NotificationTemplate) => {
    setEditModal({ open: true, template, editText: template.text });
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editModal.template) return;

    if (!editModal.editText.trim()) {
      toast.error('Le texte ne peut pas être vide');
      return;
    }

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editModal.template!.id ? { ...t, text: editModal.editText.trim() } : t,
      ),
    );

    toast.success('Modèle modifié avec succès');
    setEditModal({ open: false, template: null, editText: '' });
  }, [editModal]);

  // ── Handle Delete (manual only) ─────────────────────
  const handleDelete = useCallback((template: NotificationTemplate) => {
    if (template.isAuto) {
      toast.error('Les modèles automatiques ne peuvent pas être supprimés');
      return;
    }

    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    toast.success(`Modèle "${template.name}" supprimé`);
  }, []);

  // ── Handle Toggle Active ────────────────────────────
  const handleToggleActive = useCallback((template: NotificationTemplate) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, isActive: !t.isActive } : t,
      ),
    );
    toast.success(
      template.isActive
        ? `Modèle "${template.name}" désactivé`
        : `Modèle "${template.name}" activé`,
    );
  }, []);

  // ── Handle New Template ──────────────────────────────
  const handleNewSubmit = useCallback(() => {
    if (!newForm.name.trim() || !newForm.text.trim()) {
      toast.error('Le nom et le texte sont obligatoires');
      return;
    }

    const newTemplate: NotificationTemplate = {
      id: crypto.randomUUID(),
      name: newForm.name.trim(),
      type: newForm.type,
      text: newForm.text.trim(),
      priority: newForm.priority,
      isAuto: false,
      isActive: true,
      sendCount: 0,
    };

    setTemplates((prev) => [...prev, newTemplate]);
    setNewForm(emptyNewForm);
    setNewModalOpen(false);
    toast.success(`Modèle "${newTemplate.name}" créé avec succès`);
  }, [newForm]);

  // ── Handle Refresh ────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setTemplates(DEFAULT_TEMPLATES);
      setLoading(false);
      toast.success('Modèles réinitialisés aux valeurs par défaut');
    }, 500);
  }, []);

  // ── Compute preview text for send modal ──────────────
  const sendPreview = sendModal.template
    ? resolveText(sendModal.template, {
        NOM: sendModal.nom || '???',
        QUAI: sendModal.guichet || '???',
      })
    : '';

  // ── Render ────────────────────────────────────────────
  return (
    <AdminLayout
      title="Gestionnaire de Notifications"
      subtitle="Gérez les modèles d'annonces vocales et diffusez-les sur les kiosques"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header Actions ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Bell className="w-4 h-4" />
            {templates.length} modèle(s) · {templates.filter((t) => t.isActive).length} actif(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Réinitialiser
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setNewForm(emptyNewForm);
                setNewModalOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouvelle notification
            </Button>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-600">Nom</TableHead>
                  <TableHead className="font-semibold text-slate-600">Type</TableHead>
                  <TableHead className="font-semibold text-slate-600">Priorité</TableHead>
                  <TableHead className="font-semibold text-slate-600">Mode</TableHead>
                  <TableHead className="font-semibold text-slate-600">Statut</TableHead>
                  <TableHead className="font-semibold text-slate-600">Envois</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const pc = PRIORITY_CONFIG[template.priority];

                  return (
                    <TableRow
                      key={template.id}
                      className={`group ${!template.isActive ? 'opacity-50' : ''}`}
                    >
                      {/* Name */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{template.name}</span>
                          <span className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                            {template.text}
                          </span>
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                          {TYPE_LABELS[template.type]}
                        </Badge>
                      </TableCell>

                      {/* Priority Badge */}
                      <TableCell>
                        <Badge className={pc.color}>{pc.label}</Badge>
                      </TableCell>

                      {/* Auto / Manual */}
                      <TableCell>
                        <Badge
                          className={
                            template.isAuto
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                          }
                        >
                          {template.isAuto ? 'Auto' : 'Manuel'}
                        </Badge>
                      </TableCell>

                      {/* Status (active toggle) */}
                      <TableCell>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={template.isActive}
                          aria-label={template.isActive ? 'Désactiver' : 'Activer'}
                          onClick={() => handleToggleActive(template)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                            template.isActive ? 'bg-emerald-600' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              template.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </TableCell>

                      {/* Send Count */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Send className="w-3.5 h-3.5" />
                          <span>{template.sendCount}</span>
                          {template.lastSentAt && (
                            <span className="text-xs text-slate-400">
                              ({new Date(template.lastSentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Test button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTest(template)}
                            disabled={testing === template.id || !template.isActive}
                            className="h-8 px-2 text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg"
                            title="Tester localement (PC admin uniquement)"
                          >
                            <Play className={`w-3.5 h-3.5 mr-1 ${testing === template.id ? 'animate-pulse' : ''}`} />
                            {testing === template.id ? 'En cours...' : 'Tester'}
                          </Button>

                          {/* Send button (manual only) */}
                          {!template.isAuto && template.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendClick(template)}
                              className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg"
                              title="Envoyer aux kiosques"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              Envoyer
                            </Button>
                          )}

                          {/* Edit button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOpen(template)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Modifier le texte"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>

                          {/* Delete button (manual only) */}
                          {!template.isAuto && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Info card ──────────────────────────────────── */}
        <div className="rounded-xl border bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-700">Variables disponibles</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { var: '{DESTINATION}', desc: 'Destination du bus' },
              { var: '{NOM}', desc: 'Nom de la personne' },
              { var: '{QUAI}', desc: 'Numéro de quai / guichet' },
              { var: '{MINUTES}', desc: 'Minutes de retard' },
              { var: '{HEURE}', desc: 'Heure de départ' },
            ].map((v) => (
              <code
                key={v.var}
                className="bg-white border rounded px-2 py-1 text-xs font-mono text-slate-700"
                title={v.desc}
              >
                {v.var}
              </code>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Utilisez ces variables dans le texte des modèles. Elles seront remplacées lors de l&apos;envoi.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* DIALOGS                                            */}
        {/* ════════════════════════════════════════════════════ */}

        {/* ── Send Modal (CLIENT_CALL / DRIVER_CALL) ─────── */}
        <Dialog
          open={sendModal.open}
          onOpenChange={(open) => {
            if (!open) setSendModal({ open: false, template: null, nom: '', guichet: '' });
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-500" />
                Envoyer : {sendModal.template?.name}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations pour personnaliser l&apos;annonce vocale.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="send-nom">
                  Nom {sendModal.template?.type === 'DRIVER_CALL' ? 'du chauffeur' : 'du client'}
                </Label>
                <Input
                  id="send-nom"
                  placeholder="Ex : Jean Dupont"
                  value={sendModal.nom}
                  onChange={(e) =>
                    setSendModal((prev) => ({ ...prev, nom: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-guichet">Numéro de guichet / Quai</Label>
                <Input
                  id="send-guichet"
                  placeholder="Ex : Quai 3"
                  value={sendModal.guichet}
                  onChange={(e) =>
                    setSendModal((prev) => ({ ...prev, guichet: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Aperçu</Label>
                <div className="rounded-lg bg-slate-50 border p-3">
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;{sendPreview}&rdquo;
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() =>
                  setSendModal({ open: false, template: null, nom: '', guichet: '' })
                }
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSendSubmit}
                disabled={sending || !sendModal.nom.trim() || !sendModal.guichet.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Modal ─────────────────────────────────── */}
        <Dialog
          open={editModal.open}
          onOpenChange={(open) => {
            if (!open) setEditModal({ open: false, template: null, editText: '' });
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-sky-500" />
                Modifier : {editModal.template?.name}
              </DialogTitle>
              <DialogDescription>
                Modifiez le texte de l&apos;annonce. Les variables sont conservées.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-text">Texte de l&apos;annonce</Label>
                <Textarea
                  id="edit-text"
                  rows={4}
                  value={editModal.editText}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, editText: e.target.value }))
                  }
                  placeholder="Madame, Monsieur, ..."
                  className="resize-none"
                />
                <p className="text-xs text-slate-400">
                  Variables : {'{DESTINATION}'}, {'{NOM}'}, {'{QUAI}'}, {'{MINUTES}'}, {'{HEURE}'}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() =>
                  setEditModal({ open: false, template: null, editText: '' })
                }
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleEditSave}
                disabled={!editModal.editText.trim()}
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
              >
                <Volume2 className="w-4 h-4 mr-1.5" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── New Template Modal ─────────────────────────── */}
        <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Nouvelle notification
              </DialogTitle>
              <DialogDescription>
                Créez un nouveau modèle d&apos;annonce vocale manuelle.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nom du modèle *</Label>
                <Input
                  id="new-name"
                  placeholder="Ex : Appel Client VIP"
                  value={newForm.name}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-type">Type *</Label>
                <Select
                  value={newForm.type}
                  onValueChange={(val) =>
                    setNewForm((prev) => ({
                      ...prev,
                      type: val as NotificationTemplate['type'],
                    }))
                  }
                >
                  <SelectTrigger id="new-type">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT_CALL">Appel Client</SelectItem>
                    <SelectItem value="DRIVER_CALL">Appel Chauffeur</SelectItem>
                    <SelectItem value="SECURITY">Sécurité</SelectItem>
                    <SelectItem value="GENERAL">Général</SelectItem>
                    <SelectItem value="BOARDING">Embarquement</SelectItem>
                    <SelectItem value="IMMINENT">Départ imminent</SelectItem>
                    <SelectItem value="DELAY">Retard</SelectItem>
                    <SelectItem value="DEPARTED">Départ effectué</SelectItem>
                    <SelectItem value="CANCELLED">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-text">Texte de l&apos;annonce *</Label>
                <Textarea
                  id="new-text"
                  rows={4}
                  value={newForm.text}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, text: e.target.value }))
                  }
                  placeholder="Madame, Monsieur, ..."
                  className="resize-none"
                />
                <p className="text-xs text-slate-400">
                  Variables : {'{DESTINATION}'}, {'{NOM}'}, {'{QUAI}'}, {'{MINUTES}'}, {'{HEURE}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-priority">Priorité *</Label>
                <Select
                  value={newForm.priority}
                  onValueChange={(val) =>
                    setNewForm((prev) => ({
                      ...prev,
                      priority: val as NotificationTemplate['priority'],
                    }))
                  }
                >
                  <SelectTrigger id="new-priority">
                    <SelectValue placeholder="Sélectionner une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1_URGENT">P1 — Urgent</SelectItem>
                    <SelectItem value="P2_HIGH">P2 — Haut</SelectItem>
                    <SelectItem value="P3_NORMAL">P3 — Normal</SelectItem>
                    <SelectItem value="P4_LOW">P4 — Bas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setNewModalOpen(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleNewSubmit}
                disabled={!newForm.name.trim() || !newForm.text.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
