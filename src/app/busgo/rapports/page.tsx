'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Ticket, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalDepartures: number;
  totalTickets: number;
  boarded: number;
  absent: number;
  revenue: number;
}

export default function BusGoRapportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=today', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const departures = Array.isArray(data) ? data : data.data || [];
      
      const totalTickets = departures.reduce((acc: number, d: { ticketsTotal?: number }) => 
        acc + (d.ticketsTotal ?? 0), 0);
      
      setStats({
        totalDepartures: departures.length,
        totalTickets,
        boarded: 0,
        absent: 0,
        revenue: totalTickets * 5000, // estimation 5000 FCFA/ticket
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-muted-foreground">Statistiques du jour.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Départs aujourd&apos;hui</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDepartures ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Billets vendus</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTickets ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passagers embarqués</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.boarded ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenu estimé</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.revenue ?? 0).toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Rapports détaillés (graphiques, export PDF/Excel) disponibles prochainement.
        </CardContent>
      </Card>
    </div>
  );
}
