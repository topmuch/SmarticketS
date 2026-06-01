'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgency } from '@/app/agence/layout';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  Clock,
  Volume2,
  VolumeX,
  Upload,
  Send,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Radio,
  RefreshCw,
  MapPin,
  Loader2,
  X,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface Station {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string | null;
  isActive: boolean;
  _count?: { departuresAsOrigin: number; departuresAsDest: number };
}

interface Departure {
  id: string;
  scheduledTime: string;
  effectiveTime: string;
  destination: string;
  destinationCity: string;
  destinationStationName: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  countdownMin: number;
  availableSeats: number;
  totalSeats: number;
  fillRate: number;
  lineNumber: string;
}

/* ═══════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════ */

export default function KioskManagementPage() {
  const { user } = useAuth();
  const { agencyId } = useAgency();

  /* ── Station & Socket State ── */
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationSlug, setSelectedStationSlug] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  /* ── Departures State ── */
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

  /* ── Delay Modal State ── */
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayTarget, setDelayTarget] = useState<{
    id: string;
    scheduledTime: string;
    destination: string;
  } | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [delaySubmitting, setDelaySubmitting] = useState(false);

  /* ── General Message Config ── */
  const [messageFrequency, setMessageFrequency] = useState('30');
  const [messageText, setMessageText] = useState(
    'Bienvenue à la gare ! Merci de voyager avec nous. Bon voyage et bonne route !'
  );
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [messageSaving, setMessageSaving] = useState(false);

  /* ── Kiosk Control ── */
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);

  /* ── Action Feedback ── */
  const [departingId, setDepartingId] = useState<string | null>(null);

  /* ═══════════════════════════════════════════════════════════════
     Fetch Stations
     ═══════════════════════════════════════════════════════════════ */
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      const data = await res.json();
      if (data.stations && data.stations.length > 0) {
        const activeStations = data.stations.filter((s: Station) => s.isActive);
        setStations(activeStations);
        // Auto-select first station if none selected
        if (!selectedStationSlug && activeStations.length > 0) {
          setSelectedStationSlug(activeStations[0].slug);
        }
      }
    } catch (err) {
      console.error('[Kiosk] Error fetching stations:', err);
    }
  }, [agencyId, selectedStationSlug]);

  /* ═══════════════════════════════════════════════════════════════
     Fetch Departures (from signage API)
     ═══════════════════════════════════════════════════════════════ */
  const fetchDepartures = useCallback(async () => {
    if (!selectedStationSlug) return;
    setLoadingDepartures(true);
    try {
      const res = await fetch(`/api/signage-slug/${selectedStationSlug}`);
      const data = await res.json();
      if (data.departures) {
        setDepartures(data.departures);
      }
      setLastPoll(new Date());
    } catch (err) {
      console.error('[Kiosk] Error fetching departures:', err);
    } finally {
      setLoadingDepartures(false);
    }
  }, [selectedStationSlug]);

  /* ── Poll every 30 seconds ── */
  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  /* ═══════════════════════════════════════════════════════════════
     WebSocket Connection
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!selectedStationSlug) return;

    const socketInstance = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setSocketConnected(true);
      socketInstance.emit('join:station', selectedStationSlug);
    });

    socketInstance.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for updates broadcast from other sources
    socketInstance.on('kiosk:delay', () => {
      fetchDepartures();
    });

    socketInstance.on('kiosk:departed', () => {
      fetchDepartures();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [selectedStationSlug, fetchDepartures]);

  // Re-join station room on reconnect
  useEffect(() => {
    if (socket && socketConnected && selectedStationSlug) {
      socket.emit('join:station', selectedStationSlug);
    }
  }, [socket, socketConnected, selectedStationSlug]);

  /* ═══════════════════════════════════════════════════════════════
     Fetch stations on mount
     ═══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  /* ═══════════════════════════════════════════════════════════════
     Actions
     ═══════════════════════════════════════════════════════════════ */

  /** Open delay modal */
  const openDelayModal = (dep: Departure) => {
    setDelayTarget({
      id: dep.id,
      scheduledTime: dep.scheduledTime,
      destination: dep.destination,
    });
    setDelayMinutes(10);
    setDelayModalOpen(true);
  };

  /** Submit delay: update DB + broadcast via Socket.io */
  const submitDelay = async () => {
    if (!delayTarget || !socket) return;
    setDelaySubmitting(true);
    try {
      // Update DB
      await fetch('/api/admin/departures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: delayTarget.id,
          status: 'DELAYED',
          delayMinutes,
        }),
      });

      // Broadcast to kiosk
      socket.emit('kiosk:delay', {
        stationSlug: selectedStationSlug,
        departureId: delayTarget.id,
        minutes: delayMinutes,
        destination: delayTarget.destination,
      });

      setDelayModalOpen(false);
      // Immediately refresh departures
      await fetchDepartures();
    } catch (err) {
      console.error('[Kiosk] Error submitting delay:', err);
    } finally {
      setDelaySubmitting(false);
    }
  };

  /** Mark as departed: update DB + broadcast via Socket.io */
  const markDeparted = async (dep: Departure) => {
    if (!socket) return;
    setDepartingId(dep.id);
    try {
      await fetch('/api/admin/departures', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dep.id,
          status: 'DEPARTED',
        }),
      });

      socket.emit('kiosk:departed', {
        stationSlug: selectedStationSlug,
        departureId: dep.id,
        destination: dep.destination,
      });

      // Immediately refresh departures
      await fetchDepartures();
    } catch (err) {
      console.error('[Kiosk] Error marking departed:', err);
    } finally {
      setDepartingId(null);
    }
  };

  /** Save & broadcast general message config */
  const saveMessageConfig = async () => {
    if (!socket) return;
    setMessageSaving(true);
    try {
      socket.emit('kiosk:config', {
        stationSlug: selectedStationSlug,
        config: {
          type: 'general_message',
          frequency: parseInt(messageFrequency),
          text: messageText,
          audioUploaded: !!audioFile,
        },
      });
    } catch (err) {
      console.error('[Kiosk] Error saving message config:', err);
    } finally {
      setMessageSaving(false);
    }
  };

  /** Test TTS locally */
  const testTTS = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  /** Broadcast volume change */
  const broadcastVolume = useCallback(
    (val: number) => {
      if (!socket || muted) return;
      socket.emit('kiosk:config', {
        stationSlug: selectedStationSlug,
        config: { type: 'volume', volume: val },
      });
    },
    [socket, selectedStationSlug, muted]
  );

  /** Broadcast mute change */
  const broadcastMute = useCallback(
    (val: boolean) => {
      if (!socket) return;
      socket.emit('kiosk:config', {
        stationSlug: selectedStationSlug,
        config: { type: 'mute', muted: val },
      });
    },
    [socket, selectedStationSlug]
  );

  /* ═══════════════════════════════════════════════════════════════
     Status Badge Helper
     ═══════════════════════════════════════════════════════════════ */
  const getStatusBadge = (status: string, delayMinutes: number) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            À l'heure
          </Badge>
        );
      case 'BOARDING':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
            Embarquement
          </Badge>
        );
      case 'DELAYED':
        return (
          <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse" />
            Retard {delayMinutes > 0 ? `+${delayMinutes}min` : ''}
          </Badge>
        );
      case 'DEPARTED':
        return (
          <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
            Parti
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
            Annulé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */

  if (!agencyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF1D8D]/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-[#FF1D8D]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Gestion Kiosque
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gérez l&apos;affichage des départs en temps réel
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Socket status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            socketConnected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <Radio className="w-3 h-3" />
            {socketConnected ? 'Connecté' : 'Déconnecté'}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Live
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDepartures}
            disabled={loadingDepartures}
          >
            <RefreshCw className={`w-4 h-4 ${loadingDepartures ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Station Selector ── */}
      {stations.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <Label className="text-sm font-medium">Gare active</Label>
              </div>
              <Select value={selectedStationSlug} onValueChange={setSelectedStationSlug}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Sélectionner une gare..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.slug}>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {station.name} — {station.city}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Active Departures Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Départs Actifs</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {departures.filter((d) => d.status !== 'DEPARTED' && d.status !== 'CANCELLED').length} en cours
              </Badge>
            </div>
            {lastPoll && (
              <span className="text-xs text-slate-400">
                Dernière MAJ: {lastPoll.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
          <CardDescription>
            Départs en temps réel depuis l&apos;affichage gare — Actualisation automatique toutes les 30 secondes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingDepartures && departures.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-500">Chargement des départs...</span>
            </div>
          ) : departures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">Aucun départ en cours</p>
              <p className="text-xs mt-1">Les départs apparaîtront ici automatiquement</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Heure
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Quai
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Places
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {departures.map((dep) => (
                    <tr
                      key={dep.id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                        dep.status === 'DEPARTED' || dep.status === 'CANCELLED'
                          ? 'opacity-50'
                          : ''
                      }`}
                    >
                      {/* Time */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                            {dep.effectiveTime}
                          </span>
                          {dep.delayMinutes > 0 && (
                            <span className="text-xs text-rose-500 line-through font-mono">
                              {dep.scheduledTime}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {dep.destination}
                          </span>
                          <span className="text-xs text-slate-400">
                            {dep.lineNumber}
                          </span>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="px-4 py-3 text-center">
                        {dep.platform ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300">
                            {dep.platform}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(dep.status, dep.delayMinutes)}
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-medium ${
                            dep.fillRate > 90
                              ? 'text-rose-600 dark:text-rose-400'
                              : dep.fillRate > 70
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {dep.availableSeats}/{dep.totalSeats}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                dep.fillRate > 90
                                  ? 'bg-rose-500'
                                  : dep.fillRate > 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${dep.fillRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {dep.status !== 'DEPARTED' && dep.status !== 'CANCELLED' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                onClick={() => openDelayModal(dep)}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                Retard
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                onClick={() => markDeparted(dep)}
                                disabled={departingId === dep.id}
                              >
                                {departingId === dep.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                )}
                                Parti
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Config Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── General Message Config ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Annonce Générale</CardTitle>
                <CardDescription>
                  Configuration du message d&apos;accueil diffusé en boucle
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Frequency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fréquence de diffusion</Label>
              <Select value={messageFrequency} onValueChange={setMessageFrequency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Toutes les 30 min</SelectItem>
                  <SelectItem value="90">Toutes les 1h30</SelectItem>
                  <SelectItem value="120">Toutes les 2h</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Text */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Texte de l&apos;annonce</Label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                placeholder="Entrez le message d'annonce..."
                className="resize-none"
              />
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Audio personnalisé (optionnel)</Label>
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#FF1D8D]/50 hover:bg-[#FF1D8D]/5 transition-colors"
              >
                {audioFile ? (
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-lg bg-[#FF1D8D]/10 flex items-center justify-center">
                      <Radio className="w-4 h-4 text-[#FF1D8D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {audioFile.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioFile(null);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Glisser un fichier audio
                      </p>
                      <p className="text-xs text-slate-400">MP3, WAV — Max 10 MB</p>
                    </div>
                  </>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFile(file);
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={saveMessageConfig}
                disabled={messageSaving || !socketConnected}
                className="flex-1 bg-[#FF1D8D] hover:bg-[#FF1D8D]/90 text-white"
              >
                {messageSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer au Kiosque
              </Button>
              <Button
                variant="outline"
                onClick={testTTS}
                className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/20"
              >
                <Radio className="w-4 h-4 mr-2" />
                Tester
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Kiosk Control ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Contrôle Kiosque</CardTitle>
                <CardDescription>
                  Volume et audio du kiosque en temps réel
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Volume Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Volume</Label>
                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                  {volume}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                <Slider
                  value={[volume]}
                  onValueChange={(val) => {
                    const newVol = val[0];
                    setVolume(newVol);
                    broadcastVolume(newVol);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              {/* Volume bar visualization */}
              <div className="flex gap-0.5 h-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-150 ${
                      muted
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : i < Math.ceil(volume / 5)
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Mute Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {muted ? (
                  <VolumeX className="w-5 h-5 text-rose-500" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {muted ? 'Sourdine activée' : 'Son actif'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {muted
                      ? 'Le kiosque ne diffusera aucun son'
                      : 'Le kiosque diffusera les annonces'}
                  </p>
                </div>
              </div>
              <Checkbox
                checked={muted}
                onCheckedChange={(val) => {
                  setMuted(!!val);
                  broadcastMute(!!val);
                }}
              />
            </div>

            {/* Quick Volume Presets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Raccourcis</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '0%', value: 0 },
                  { label: '25%', value: 25 },
                  { label: '50%', value: 50 },
                  { label: '75%', value: 75 },
                  { label: '100%', value: 100 },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={volume === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs ${volume === preset.value ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
                    onClick={() => {
                      setVolume(preset.value);
                      broadcastVolume(preset.value);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Connection Info */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Gare: <strong>{selectedStationSlug || '—'}</strong>
                </span>
                <span className="mx-1">•</span>
                <span>
                  Socket:{' '}
                  <strong className={socketConnected ? 'text-emerald-600' : 'text-rose-600'}>
                    {socketConnected ? 'Connecté' : 'Déconnecté'}
                  </strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         Delay Modal
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={delayModalOpen} onOpenChange={setDelayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Signaler un Retard
            </DialogTitle>
            <DialogDescription>
              Enregistrez un retard qui sera immédiatement affiché sur le kiosque et notifié aux passagers.
            </DialogDescription>
          </DialogHeader>

          {delayTarget && (
            <div className="space-y-4 py-2">
              {/* Trip Summary */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Trajet:</span>{' '}
                  {delayTarget.scheduledTime} → {delayTarget.destination}
                </p>
              </div>

              {/* Delay Minutes Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Durée du retard (minutes)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 0)))}
                    className="w-32 text-center text-lg font-bold"
                  />
                  <span className="text-sm text-slate-500">minutes</span>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: '+5 min', value: 5 },
                    { label: '+10 min', value: 10 },
                    { label: '+15 min', value: 15 },
                    { label: '+30 min', value: 30 },
                    { label: '+60 min', value: 60 },
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant={delayMinutes === preset.value ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs ${delayMinutes === preset.value ? 'bg-amber-600 hover:bg-amber-600' : 'border-amber-300 text-amber-700'}`}
                      onClick={() => setDelayMinutes(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Calculated new time */}
              {delayTarget.scheduledTime && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-400 mb-1">Nouvel horaire estimé</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {(() => {
                      const parts = delayTarget.scheduledTime.split(':');
                      const h = parseInt(parts[0]);
                      const m = parseInt(parts[1]);
                      const newDate = new Date();
                      newDate.setHours(h, m + delayMinutes);
                      return newDate.toTimeString().slice(0, 5);
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDelayModalOpen(false)}
              disabled={delaySubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={submitDelay}
              disabled={delaySubmitting || !socketConnected}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {delaySubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Confirmer le Retard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
