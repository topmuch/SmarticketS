'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  ImageIcon,
  VideoIcon,
  Megaphone,
  RefreshCw,
  X,
  Save,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Link,
  Globe,
  Smartphone,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SignageAd {
  id: string;
  title: string;
  mediaType: string; // "IMAGE" | "VIDEO"
  mediaUrl: string;
  videoUrl: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  duration: number; // seconds
  interval: number; // minutes
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  priority: number;
  views: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDatetimeLocal(dateStr: string): string {
  const d = new Date(dateStr);
  // Format: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SignageAdsPage() {
  /* ---- state ---- */
  const [ads, setAds] = useState<SignageAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formMediaType, setFormMediaType] = useState<'IMAGE' | 'VIDEO' | ''>('');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formMediaFilename, setFormMediaFilename] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formMobileImageUrl, setFormMobileImageUrl] = useState('');
  const [formDuration, setFormDuration] = useState(10);
  const [formInterval, setFormInterval] = useState(30);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Toggle between upload mode and URL mode
  const [mediaInputMode, setMediaInputMode] = useState<'upload' | 'url'>('upload');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SignageAd | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggling state (per card)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- toast helper ---- */
  const addToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  /* ---- fetch ---- */
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/signage-ads?all=true');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        addToast('error', err.error || 'Erreur lors du chargement');
        return;
      }
      const data: SignageAd[] = await res.json();
      setAds(data);
    } catch {
      addToast('error', 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  /* ---- reset form ---- */
  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormMediaType('');
    setFormMediaUrl('');
    setFormMediaFilename('');
    setFormVideoUrl('');
    setFormImageUrl('');
    setFormMobileImageUrl('');
    setFormDuration(10);
    setFormInterval(30);
    setFormStartDate(toDatetimeLocal(new Date().toISOString()));
    setFormEndDate('');
    setFormPriority(0);
    setFormErrors({});
    setMediaInputMode('upload');
  }, []);

  /* ---- open dialog ---- */
  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  /* ---- file upload ---- */
  const handleFileSelect = useCallback(
    async (file: File) => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!allowed.includes(file.type)) {
        addToast('error', 'Type non autorisé. Utilisez JPG, PNG, GIF, WebP ou MP4.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        addToast('error', 'Fichier trop volumineux (max 50 MB).');
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload échoué' }));
          addToast('error', err.error || "Erreur lors de l'upload");
          return;
        }
        const data = await res.json();
        setFormMediaUrl(data.url);
        setFormMediaType(data.type); // "IMAGE" | "VIDEO"
        setFormMediaFilename(data.filename || file.name);
        setFormErrors((prev) => ({ ...prev, media: '' }));
        addToast('success', 'Fichier téléchargé avec succès');
      } catch {
        addToast('error', "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    [addToast],
  );

  /* ---- validate + submit ---- */
  const handleSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = 'Le titre est requis';
    if (!formMediaUrl && !formVideoUrl && !formImageUrl) errors.media = 'Un fichier ou une URL est requis';
    if (!formStartDate) errors.startDate = 'La date de début est requise';
    if (formDuration < 5 || formDuration > 60) errors.duration = 'Entre 5 et 60 secondes';
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    const hasVideoUrl = !!formVideoUrl.trim();
    const hasImageUrl = !!formImageUrl.trim();
    const resolvedMediaType = hasVideoUrl ? 'VIDEO' : hasImageUrl ? 'IMAGE' : formMediaType || 'IMAGE';
    const resolvedMediaUrl = formMediaUrl || formImageUrl || formVideoUrl || '';

    setSaving(true);
    try {
      const res = await fetch('/api/signage-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          mediaType: resolvedMediaType,
          mediaUrl: resolvedMediaUrl,
          videoUrl: formVideoUrl.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          mobileImageUrl: formMobileImageUrl.trim() || null,
          duration: formDuration,
          interval: formInterval,
          startDate: formStartDate,
          endDate: formEndDate || null,
          priority: formPriority,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        addToast('error', err.error || 'Erreur lors de la création');
        return;
      }

      addToast('success', 'Publicité créée avec succès');
      setDialogOpen(false);
      resetForm();
      fetchAds();
    } catch {
      addToast('error', 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  }, [
    formTitle,
    formMediaType,
    formMediaUrl,
    formVideoUrl,
    formImageUrl,
    formDuration,
    formInterval,
    formStartDate,
    formEndDate,
    formPriority,
    addToast,
    resetForm,
    fetchAds,
  ]);

  /* ---- toggle active ---- */
  const handleToggle = useCallback(
    async (ad: SignageAd) => {
      setTogglingId(ad.id);
      try {
        const res = await fetch(`/api/signage-ads/${ad.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !ad.isActive }),
        });
        if (!res.ok) {
          addToast('error', 'Erreur lors de la modification');
          return;
        }
        addToast('success', ad.isActive ? 'Publicité désactivée' : 'Publicité activée');
        fetchAds();
      } catch {
        addToast('error', 'Erreur de connexion');
      } finally {
        setTogglingId(null);
      }
    },
    [addToast, fetchAds],
  );

  /* ---- delete ---- */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/signage-ads/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        addToast('error', 'Erreur lors de la suppression');
        return;
      }
      addToast('success', 'Publicité supprimée');
      setDeleteTarget(null);
      fetchAds();
    } catch {
      addToast('error', 'Erreur de connexion');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, addToast, fetchAds]);

  /* ---- stats ---- */
  const totalAds = ads.length;
  const activeAds = ads.filter((a) => a.isActive).length;

  /* ---- drop handler ---- */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="max-w-7xl mx-auto">
      {/* -------- Page Header -------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#FF1D8D]" />
            Publicités &mdash; Affichage Gare
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérez les publicités diffusées sur les bornes kiosques de la gare
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={fetchAds}
            variant="outline"
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer une publicité
          </Button>
        </div>
      </div>

      {/* -------- Stats Row -------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalAds}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeAds}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Actives</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-[#FF1D8D]">{totalAds - activeAds}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Inactives</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {ads.reduce((sum, a) => sum + a.views, 0).toLocaleString()}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Vues totales</p>
          </CardContent>
        </Card>
      </div>

      {/* -------- Loading State -------- */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#FF1D8D]/30 border-t-[#FF1D8D] rounded-full animate-spin" />
        </div>
      )}

      {/* -------- Empty State -------- */}
      {!loading && ads.length === 0 && (
        <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardContent className="py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
              Aucune publicité pour l&apos;affichage gare
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm max-w-md text-center">
              Créez votre première publicité pour qu&apos;elle soit diffusée sur les bornes kiosques.
            </p>
            <Button
              onClick={openCreateDialog}
              className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white rounded-xl mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une publicité
            </Button>
          </CardContent>
        </Card>
      )}

      {/* -------- Ad Cards Grid -------- */}
      {!loading && ads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              className={`bg-white dark:bg-slate-800 border shadow-sm rounded-2xl overflow-hidden transition-all duration-200 ${
                ad.isActive
                  ? 'border-slate-100 dark:border-slate-700 hover:shadow-md'
                  : 'border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              {/* Media Preview */}
              <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                {/* Determine effective media URL and type */}
                {(() => {
                  const effectiveVideoUrl = ad.videoUrl || (ad.mediaType === 'VIDEO' ? ad.mediaUrl : null);
                  const effectiveImageUrl = ad.imageUrl || (ad.mediaType === 'IMAGE' ? ad.mediaUrl : null);
                  const displayVideo = !!effectiveVideoUrl;
                  const displayUrl = displayVideo ? effectiveVideoUrl : effectiveImageUrl || ad.mediaUrl;

                  // Check YouTube
                  const ytMatch = displayUrl ? displayUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) : null;

                  return (
                    <>
                      {displayVideo && ytMatch ? (
                        <div className="w-full h-full">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=1&controls=1&rel=0`}
                            className="w-full h-full"
                            allow="encrypted-media"
                            title={ad.title}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                              <VideoIcon className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : displayVideo ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <video
                            src={displayUrl || undefined}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                              <VideoIcon className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={displayUrl}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                </div>`;
                            }
                          }}
                        />
                      )}
                    </>
                  );
                })()}

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <Badge
                    className={
                      ad.isActive
                        ? 'bg-emerald-500/90 text-white hover:bg-emerald-500/90'
                        : 'bg-slate-500/90 text-white hover:bg-slate-500/90'
                    }
                  >
                    {ad.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Type Badge */}
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                  <Badge
                    className={
                      (ad.videoUrl || ad.mediaType === 'VIDEO')
                        ? 'bg-purple-500/90 text-white hover:bg-purple-500/90'
                        : 'bg-sky-500/90 text-white hover:bg-sky-500/90'
                    }
                  >
                    {(ad.videoUrl || ad.mediaType === 'VIDEO') ? (
                      <VideoIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    )}
                    {(ad.videoUrl || ad.mediaType === 'VIDEO') ? 'VIDEO' : 'IMAGE'}
                  </Badge>
                  {(ad.videoUrl || ad.imageUrl) && (
                    <Badge className="bg-amber-500/90 text-white hover:bg-amber-500/90 text-[10px]">
                      <Link className="w-2.5 h-2.5 mr-0.5" />
                      URL
                    </Badge>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm truncate mb-3">
                  {ad.title}
                </h3>

                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{ad.duration}s affichage &middot; toutes les {ad.interval}min</span>
                  </div>

                  {(ad.videoUrl || ad.imageUrl) && (
                    <div className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                      <span className="truncate">
                        {ad.videoUrl && (
                          <span className="inline-flex items-center gap-0.5">
                            <VideoIcon className="w-3 h-3" /> Vidéo
                          </span>
                        )}
                        {ad.videoUrl && ad.imageUrl && ' + '}
                        {ad.imageUrl && (
                          <span className="inline-flex items-center gap-0.5">
                            <ImageIcon className="w-3 h-3" /> Image
                          </span>
                        )}
                        {ad.mobileImageUrl && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-500">
                            <Smartphone className="w-3 h-3" /> Mobile
                          </span>
                        )}
                        {' '}&middot; source URL
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {formatDate(ad.startDate)}
                      {ad.endDate && (
                        <span className="text-slate-400 dark:text-slate-500">
                          {' '}
                          &rarr; {formatDate(ad.endDate)}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{ad.views.toLocaleString()} vues</span>
                    <span className="ml-auto text-slate-400 dark:text-slate-500">
                      Priorité: {ad.priority}
                    </span>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(ad)}
                    disabled={togglingId === ad.id}
                    className={`h-8 px-3 rounded-lg text-xs font-medium ${
                      ad.isActive
                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    {togglingId === ad.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : ad.isActive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Activer
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(ad)}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ============ CREATE DIALOG ============ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-[540px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#FF1D8D]" />
              Nouvelle publicité &mdash; Affichage gare
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Créez une publicité qui sera diffusée sur les bornes kiosques de la gare.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Title */}
            <div>
              <Label className="text-slate-700 dark:text-slate-300 text-sm">
                Titre <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  setFormErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder="Ex: Offre spéciale été 2026"
                className={`mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl ${
                  formErrors.title ? 'border-red-400 dark:border-red-500' : ''
                }`}
              />
              {formErrors.title && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.title}
                </p>
              )}
            </div>

            {/* Media Input: Upload or URL mode toggle */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-slate-700 dark:text-slate-300 text-sm flex-1">
                  Média <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setMediaInputMode('upload')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      mediaInputMode === 'upload'
                        ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Upload className="w-3 h-3 inline mr-1" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaInputMode('url')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      mediaInputMode === 'url'
                        ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Link className="w-3 h-3 inline mr-1" />
                    URL
                  </button>
                </div>
              </div>

              {/* ── Upload mode ── */}
              {mediaInputMode === 'upload' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                    formMediaUrl
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 hover:border-[#FF1D8D]/50 hover:bg-[#FF1D8D]/5 dark:hover:bg-[#FF1D8D]/5'
                  } ${formErrors.media ? 'border-red-400 dark:border-red-500' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                      e.target.value = '';
                    }}
                  />

                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-[#FF1D8D] animate-spin" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Téléchargement en cours...</p>
                    </>
                  ) : formMediaUrl ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {formMediaFilename || 'Fichier prêt'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formMediaType === 'VIDEO' ? 'Vidéo MP4' : 'Image'} &middot; Cliquez pour remplacer
                        </p>
                      </div>
                      {/* Preview thumbnail */}
                      <div className="w-full max-w-[200px] mt-1 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                        {formMediaType === 'VIDEO' ? (
                          <div className="aspect-video flex items-center justify-center">
                            <VideoIcon className="w-6 h-6 text-purple-400" />
                          </div>
                        ) : (
                          <img
                            src={formMediaUrl}
                            alt="Preview"
                            className="w-full h-auto object-cover max-h-28"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Glissez-déposez ou cliquez pour sélectionner
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          JPG, PNG, GIF, WebP ou MP4 &middot; max 50 MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── URL mode ── */}
              {mediaInputMode === 'url' && (
                <div className="space-y-4">
                  {/* Video URL */}
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <VideoIcon className="w-3.5 h-3.5 text-purple-500" />
                      URL de la vidéo
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(optionnel)</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="url"
                        value={formVideoUrl}
                        onChange={(e) => {
                          setFormVideoUrl(e.target.value);
                          setFormErrors((prev) => ({ ...prev, media: '' }));
                        }}
                        placeholder="https://example.com/video.mp4 ou https://youtube.com/watch?v=..."
                        className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      MP4, WebM, OGG, YouTube &middot; Si renseigné, la vidéo sera prioritaire
                    </p>
                    {/* Video preview */}
                    {formVideoUrl && (() => {
                      const ytMatch = formVideoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      if (ytMatch) {
                        return (
                          <div className="mt-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 max-w-[280px] aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=1&controls=1&rel=0`}
                              className="w-full h-full"
                              allow="encrypted-media"
                              title="YouTube preview"
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="mt-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 max-w-[280px]">
                          <video
                            src={formVideoUrl}
                            className="w-full aspect-video object-contain"
                            muted
                            preload="metadata"
                            controls
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Image URL */}
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                      URL de l&apos;image
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(optionnel)</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="url"
                        value={formImageUrl}
                        onChange={(e) => {
                          setFormImageUrl(e.target.value);
                          setFormErrors((prev) => ({ ...prev, media: '' }));
                        }}
                        placeholder="https://example.com/banner.jpg"
                        className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      JPG, PNG, GIF, WebP &middot; Utilisée si pas de vidéo
                    </p>
                    {/* Image preview */}
                    {formImageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 max-w-[280px]">
                        <img
                          src={formImageUrl}
                          alt="Preview"
                          className="w-full h-auto object-cover max-h-28"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Mobile Image URL (9:16) */}
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                      URL image mobile (9:16)
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(optionnel)</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        type="url"
                        value={formMobileImageUrl}
                        onChange={(e) => {
                          setFormMobileImageUrl(e.target.value);
                        }}
                        placeholder="https://example.com/banner-mobile-9x16.jpg"
                        className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Format vertical 9:16 pour mobile &middot; Remplace l&apos;image principale sur téléphone
                    </p>
                    {/* Mobile image preview */}
                    {formMobileImageUrl && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 w-[63px] h-[112px] border-2 border-emerald-400">
                          <img
                            src={formMobileImageUrl}
                            alt="Mobile Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">Aperçu 9:16</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formErrors.media && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {formErrors.media}
                </p>
              )}
            </div>

            {/* Duration + Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-sm">
                  Durée d&apos;affichage (s) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={formDuration}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 5;
                    setFormDuration(Math.min(60, Math.max(5, v)));
                    setFormErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className={`mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl ${
                    formErrors.duration ? 'border-red-400 dark:border-red-500' : ''
                  }`}
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">5 &ndash; 60 secondes</p>
                {formErrors.duration && (
                  <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.duration}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-sm">
                  Intervalle de diffusion
                </Label>
                <Select value={String(formInterval)} onValueChange={(v) => setFormInterval(Number(v))}>
                  <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date + End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-sm">
                  Date de début <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formStartDate}
                  onChange={(e) => {
                    setFormStartDate(e.target.value);
                    setFormErrors((prev) => ({ ...prev, startDate: '' }));
                  }}
                  className={`mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl ${
                    formErrors.startDate ? 'border-red-400 dark:border-red-500' : ''
                  }`}
                />
                {formErrors.startDate && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300 text-sm">
                  Date de fin <span className="text-slate-400 dark:text-slate-500">(optionnel)</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-slate-700 dark:text-slate-300 text-sm">Priorité</Label>
              <Input
                type="number"
                min={0}
                value={formPriority}
                onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                className="mt-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Plus élevé = affichage prioritaire (0 par défaut)
              </p>
            </div>
          </div>

          <Separator className="my-2" />

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Créer la publicité
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION DIALOG ============ */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-white">
              Supprimer la publicité
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Cette action est irréversible. La publicité ne sera plus diffusée.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600 flex-shrink-0">
                {deleteTarget.mediaType === 'VIDEO' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-5 h-5 text-purple-400" />
                  </div>
                ) : (
                  <img
                    src={deleteTarget.mediaUrl}
                    alt={deleteTarget.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-white text-sm truncate">
                  {deleteTarget.title}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{deleteTarget.mediaType}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ TOAST MESSAGES ============ */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 animate-in slide-in-from-right ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
