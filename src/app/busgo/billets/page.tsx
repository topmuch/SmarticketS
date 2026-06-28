'use client';

/**
 * BusGo Billets — Tous les billets enregistrés, groupés par destination.
 *
 * Affiche pour chaque destination:
 *   - Nombre total de billets
 *   - Passagers présents (BOARDED) et absents (ACTIVE/ABSENT)
 *   - Nom, prénom, téléphone, siège, n° ticket papier
 *   - Date de départ
 *   - Filtre par destination + statut
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Loader2, AlertCircle, Bus, MapPin, Phone, User, Clock,
  CheckCircle2, XCircle, Search, Users, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Billet {
  id: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  paperTicketNumber: string | null;
  ticketStatus: string;
  boardedAt: string | null;
  isLate: boolean;
  lateMinutes: number;
  pwaInstalled: boolean;
  destination: string;
  departure: {
    id: string;
    lineNumber: string;
    scheduledTime: string;
    platform: string | null;
    status: string;
  } | null;
}

interface DestinationGroup {
  destination: string;
  count: number;
  boarded: number;
  absent: number;
  active: number;
  cancelled: number;
  billets: Billet[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  BOARDED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ABSENT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through dark:bg-gray-900/30 dark:text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'En attente',
  BOARDED: 'Présent',
  ABSENT: 'Absent',
  CANCELLED: 'Annulé',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function BusGoBilletsPage() {
  const [groups, setGroups] = useState<DestinationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedDest, setExpandedDest] = useState<string | null>(null);

  const fetchBillets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('destination', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/busgo/billets?${params}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setGroups(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchBillets(); }, [fetchBillets]);

  // Auto-expand first destination
  useEffect(() => {
    if (groups.length > 0 && !expandedDest) {
      setExpandedDest(groups[0].destination);
    }
  }, [groups, expandedDest]);

  const totalBillets = groups.reduce((acc, g) => acc + g.count, 0);
  const totalBoarded = groups.reduce((acc, g) => acc + g.boarded, 0);
  const totalAbsent = groups.reduce((acc, g) => acc + g.absent + g.active, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billets</h1>
        <p className="text-muted-foreground">Tous les billets enregistrés, groupés par destination.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-3 text-center">
            <Ticket className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-amber-700">{totalBillets}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-emerald-700">{totalBoarded}</div>
            <div className="text-xs text-muted-foreground">Présents</div>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 dark:bg-rose-900/20">
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 text-rose-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-rose-700">{totalAbsent}</div>
            <div className="text-xs text-muted-foreground">Absents/En attente</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={statusFilter === '' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('')}
              className={statusFilter === '' ? 'bg-amber-600' : ''}
            >
              Tous
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('ACTIVE')}
              className={statusFilter === 'ACTIVE' ? 'bg-blue-600' : ''}
            >
              En attente
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'BOARDED' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('BOARDED')}
              className={statusFilter === 'BOARDED' ? 'bg-emerald-600' : ''}
            >
              Présents
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'ABSENT' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('ABSENT')}
              className={statusFilter === 'ABSENT' ? 'bg-rose-600' : ''}
            >
              Absents
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste par destination */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            {error}
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">Aucun billet enregistré.</p>
            <a href="/busgo/guichet" className="text-amber-600 hover:underline text-sm font-medium">
              → Vendre un billet au guichet
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedDest === group.destination;
            return (
              <Card key={group.destination}>
                {/* Destination header (clickable) */}
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedDest(isExpanded ? null : group.destination)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2">
                        <MapPin className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{group.destination}</CardTitle>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" /> {group.count} billet{group.count > 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> {group.boarded} présents
                          </span>
                          <span className="flex items-center gap-1 text-rose-600">
                            <XCircle className="h-3 w-3" /> {group.absent + group.active} absents/attente
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {isExpanded ? '▲ Réduire' : '▼ Voir détails'}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Passagers list (expandable) */}
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-3 font-medium">Siège</th>
                            <th className="pb-2 pr-3 font-medium">Nom</th>
                            <th className="pb-2 pr-3 font-medium">Téléphone</th>
                            <th className="pb-2 pr-3 font-medium">Ticket papier</th>
                            <th className="pb-2 pr-3 font-medium">Départ</th>
                            <th className="pb-2 pr-3 font-medium">Ligne</th>
                            <th className="pb-2 pr-3 font-medium">PWA</th>
                            <th className="pb-2 font-medium">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.billets.map((b) => (
                            <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 pr-3">
                                <span className="font-bold text-amber-600">{b.seatNumber}</span>
                              </td>
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{b.passengerName}</span>
                                  {b.isLate && (
                                    <Badge variant="outline" className="text-xs text-rose-600 ml-1">
                                      +{b.lateMinutes}min
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 pr-3">
                                <a
                                  href={`tel:${b.passengerPhone}`}
                                  className="flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {b.passengerPhone}
                                </a>
                              </td>
                              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                                {b.paperTicketNumber || '—'}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                {b.departure ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {formatDate(b.departure.scheduledTime)}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground">
                                {b.departure?.lineNumber || '—'}
                              </td>
                              <td className="py-2 pr-3">
                                {b.pwaInstalled ? (
                                  <Badge variant="outline" className="text-xs text-emerald-600">
                                    📱 Installée
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Non
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2">
                                <span
                                  className={cn(
                                    'inline-block px-2 py-0.5 rounded text-xs font-medium',
                                    STATUS_COLORS[b.ticketStatus] || 'bg-gray-100 text-gray-700'
                                  )}
                                >
                                  {STATUS_LABELS[b.ticketStatus] || b.ticketStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
