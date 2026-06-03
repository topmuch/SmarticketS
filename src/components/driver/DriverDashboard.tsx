'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck,
  Package,
  Phone,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Loader2,
  ChevronRight,
  MapPin,
  Clock,
  User,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import { startSyncEngine, stopSyncEngine } from '@/lib/offline/sync';
import { addToSyncQueue } from '@/lib/offline/queue';

// ─── Types ────────────────────────────────────────────────

interface DriverUser {
  id: string;
  email: string;
  role: string;
  agencyId: string | null;
}

interface Delivery {
  id: string;
  reference: string;
  departureCity: string | null;
  destination: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  pickupAddress: string | null;
  colisType: string | null;
  colisWeight: number | null;
  colisColor: string | null;
  paymentStatus: string;
  estimatedArrival: string | null;
  whatsappOwner: string | null;
  retrievalPin: string | null;
}

// ─── Staff Login Form ────────────────────────────────────

function DriverLoginForm({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/driver/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      // Fallback to no port transform
      if (!res.ok) {
        const res2 = await fetch('/api/driver/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code }),
        });
        if (!res2.ok) {
          const err = await res2.json().catch(() => ({}));
          toast.error(err.error || 'Identifiants incorrects');
          return;
        }
      }

      toast.success('Connexion réussie');
      onLogin();
    } catch {
      toast.error('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  }, [phone, code, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-900 p-4">
      <Card className="w-full max-w-md border-emerald-700/30 bg-emerald-950/50 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl text-white">Espace Chauffeur</CardTitle>
          <p className="text-sm text-emerald-300/70 mt-1">
            SmarticketS — Livraison de colis
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-200">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <Input
                  type="tel"
                  placeholder="+221 77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-emerald-900/50 border-emerald-700/50 text-white placeholder:text-emerald-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-200">Code d&apos;accès</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="0000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="pl-10 bg-emerald-900/50 border-emerald-700/50 text-white placeholder:text-emerald-500/50 tracking-[0.3em] text-center text-2xl"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-6"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
          <p className="text-center text-xs text-emerald-400/50 mt-4">
            Accès réservé aux chauffeurs et agents de livraison
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Delivery Card ────────────────────────────────────────

function DeliveryCard({
  delivery,
  onDeliver,
}: {
  delivery: Delivery;
  onDeliver: (id: string, pin: string) => Promise<boolean>;
}) {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (pin.length !== 6) {
      toast.error('Le code PIN doit comporter 6 chiffres');
      return;
    }
    setConfirming(true);
    try {
      const success = await onDeliver(delivery.id, pin);
      if (success) {
        toast.success(`Colis ${delivery.reference} livré avec succès !`);
      }
    } finally {
      setConfirming(false);
    }
  };

  const typeLabel = delivery.colisType === 'VALISE' ? '🧳' : delivery.colisType === 'SAC' ? '👜' : delivery.colisType === 'CARTON' ? '📦' : delivery.colisType === 'BACKPACK' ? '🎒' : '📦';

  const whatsappMessage = `📦 *SmarticketS — Livraison Colis*\n\nRéférence : *${delivery.reference}*\nDestination : ${delivery.destination || '—'}\n\nVotre colis est prêt pour retrait.`;

  return (
    <Card className="border-emerald-700/20 bg-emerald-950/30 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-emerald-900/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeLabel}</span>
          <div>
            <p className="font-mono text-sm font-bold text-white">{delivery.reference}</p>
            <p className="text-xs text-emerald-400/70">
              {delivery.departureCity || '—'} → {delivery.destination || '—'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-emerald-300 border-emerald-600/50 text-xs">
          {delivery.paymentStatus === 'SENDER_PAID' ? 'Payé' : 'À payer'}
        </Badge>
      </div>

      <CardContent className="p-3 space-y-3">
        {/* Receiver info */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {delivery.receiverName || 'Non renseigné'}
            </p>
            {delivery.pickupAddress && (
              <p className="text-xs text-emerald-300/60 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {delivery.pickupAddress}
              </p>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-3 gap-2">
          {delivery.colisWeight && (
            <div className="text-center bg-emerald-900/30 rounded-lg p-2">
              <p className="text-xs text-emerald-400/60">Poids</p>
              <p className="text-sm font-bold text-white">{delivery.colisWeight}kg</p>
            </div>
          )}
          {delivery.colisColor && (
            <div className="text-center bg-emerald-900/30 rounded-lg p-2">
              <p className="text-xs text-emerald-400/60">Couleur</p>
              <p className="text-sm font-bold text-white">{delivery.colisColor}</p>
            </div>
          )}
          {delivery.estimatedArrival && (
            <div className="text-center bg-emerald-900/30 rounded-lg p-2">
              <p className="text-xs text-emerald-400/60">Arrivée</p>
              <p className="text-sm font-bold text-white">{delivery.estimatedArrival}</p>
            </div>
          )}
        </div>

        {/* WhatsApp button */}
        {delivery.receiverWhatsapp && (
          <WhatsAppShareButton
            phone={delivery.receiverWhatsapp}
            message={whatsappMessage}
            variant="outline"
            size="sm"
            fullWidth
            label="Notifier le destinataire"
          />
        )}

        <Separator className="bg-emerald-700/20" />

        {/* Confirm delivery section */}
        {!showPin ? (
          <Button
            onClick={() => setShowPin(true)}
            variant="default"
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmer la livraison
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Code PIN du destinataire"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="pl-10 bg-emerald-900/50 border-emerald-700/50 text-white placeholder:text-emerald-500/50 tracking-[0.3em] text-center text-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPin(false)}
                className="flex-1 text-emerald-400"
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming || pin.length !== 6}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                size="sm"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Valider
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Driver Dashboard ───────────────────────────────

export function DriverDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<DriverUser | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ pending: number; synced: number } | null>(null);
  const mountedRef = useRef(false);

  // Online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline sync engine
  useEffect(() => {
    if (!authenticated || typeof window === 'undefined') return;

    startSyncEngine();

    // Check sync status periodically
    const syncInterval = setInterval(async () => {
      try {
        const { getQueueStats } = await import('@/lib/offline/queue');
        const stats = await getQueueStats();
        setSyncStatus({ pending: stats.pending, synced: stats.synced });
      } catch {
        // ignore
      }
    }, 10000);

    return () => {
      stopSyncEngine();
      clearInterval(syncInterval);
    };
  }, [authenticated]);

  // Check session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    mountedRef.current = true;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const role = data.user.role;
            if (role === 'agent' || role === 'agency' || role === 'driver') {
              if (mountedRef.current) {
                setUser(data.user);
                setAuthenticated(true);
              }
            }
          }
        }
      } catch {
        // ignore
      }
      if (mountedRef.current) setLoading(false);
    };

    checkSession();
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch deliveries
  const fetchDeliveries = useCallback(async (silent = false) => {
    if (!authenticated) return;

    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/driver/deliveries');
      if (res.status === 401) {
        setAuthenticated(false);
        setUser(null);
        toast.error('Session expirée');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } catch {
      toast.error('Erreur de chargement. Mode hors ligne actif.');
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      fetchDeliveries();
      // Auto-refresh every 30s
      const interval = setInterval(() => fetchDeliveries(true), 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, fetchDeliveries]);

  // Handle delivery confirmation
  const handleDeliver = useCallback(async (id: string, pin: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/driver/deliver/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.maxAttemptsReached) {
          toast.error('Trop de tentatives. Contactez le support.');
        } else {
          toast.error(data.error || 'Erreur de livraison');
        }
        return false;
      }

      // Remove from list
      setDeliveries((prev) => prev.filter((d) => d.id !== id));

      // Queue for offline sync if needed
      if (!navigator.onLine) {
        await addToSyncQueue({
          url: `/api/driver/deliver/${id}`,
          method: 'POST',
          body: { pin },
        });
      }

      return true;
    } catch {
      toast.error('Erreur réseau. La requête sera synchronisée plus tard.');
      // Queue for offline sync
      await addToSyncQueue({
        url: `/api/driver/deliver/${id}`,
        method: 'POST',
        body: { pin },
      }).catch(() => {});
      return false;
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthenticated(false);
    setUser(null);
    setDeliveries([]);
    toast.success('Déconnecté');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!authenticated) {
    return <DriverLoginForm onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 text-white">
      {/* ─── Top Bar ─── */}
      <header className="sticky top-0 z-50 bg-emerald-950/90 backdrop-blur-md border-b border-emerald-700/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Chauffeur</h1>
              <p className="text-xs text-emerald-400/70">{user?.email || 'Connecté'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${
                isOnline
                  ? 'text-green-400 border-green-600/50'
                  : 'text-amber-400 border-amber-600/50'
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Badge>

            {/* Sync status */}
            {syncStatus && syncStatus.pending > 0 && (
              <Badge variant="outline" className="text-xs text-amber-400 border-amber-600/50">
                <Clock className="h-3 w-3 mr-1" />
                {syncStatus.pending} en attente
              </Badge>
            )}

            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-emerald-400 hover:text-white hover:bg-emerald-800/50">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="px-4 py-4 pb-24 max-w-lg mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-emerald-900/30 border-emerald-700/20">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{deliveries.length}</p>
              <p className="text-xs text-emerald-400/60">En transit</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-900/30 border-emerald-700/20">
            <CardContent className="p-3 text-center">
              <MapPin className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">
                {new Set(deliveries.map((d) => d.destination).filter(Boolean)).size}
              </p>
              <p className="text-xs text-emerald-400/60">Destinations</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-900/30 border-emerald-700/20">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{syncStatus?.synced || 0}</p>
              <p className="text-xs text-emerald-400/60">Livrés</p>
            </CardContent>
          </Card>
        </div>

        {/* Refresh + offline warning */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-emerald-200">
            Colis à livrer
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchDeliveries()}
            disabled={refreshing}
            className="text-emerald-400 hover:text-white hover:bg-emerald-800/50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-900/30 border border-amber-700/30">
            <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              Mode hors ligne — Les validations seront synchronisées automatiquement.
            </p>
          </div>
        )}

        {/* Delivery list */}
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <div className="space-y-3">
            {deliveries.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
                <p className="text-emerald-300/60 text-sm">Aucun colis en transit</p>
                <p className="text-emerald-400/40 text-xs mt-1">
                  Tous les colis ont été livrés
                </p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onDeliver={handleDeliver}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </main>

      {/* ─── Offline Warning Banner ─── */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-amber-900 border-t border-amber-700 px-4 py-2 text-center">
          <p className="text-xs text-amber-200 flex items-center justify-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Connexion perdue — Mode hors ligne actif
          </p>
        </div>
      )}
    </div>
  );
}
