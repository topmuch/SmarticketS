'use client';

/**
 * PWA Contrôleur — Vérification des billets pendant le trajet.
 *
 * Le contrôleur (employé de la compagnie) se connecte avec son compte.
 * Il scanne le controlCode des billets pour vérifier leur validité.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ScanLine, Loader2, CheckCircle2, AlertCircle, X,
  Ticket, User, MapPin, Bus, LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ValidationResult {
  valid: boolean;
  ticket?: {
    passengerName: string;
    seatNumber: string;
    destination: string;
    controlCode: string;
    ticketStatus: string;
    paperTicketNumber: string | null;
    boardedAt: string | null;
  };
  departure?: {
    lineNumber: string;
    destination: string;
    scheduledTime: string;
  };
  message: string;
}

export default function PwaControleurPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?role=controller');
    }
    if (!authLoading && user && !['controller', 'admin', 'superadmin'].includes(user.role)) {
      router.push('/busgo');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setScanning(true);
    setResult(null);

    try {
      const res = await fetch('/api/pwa-controleur/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ controlCode: code.trim().toUpperCase() }),
      });

      const data = await res.json();
      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));
      setCode('');
    } catch {
      setResult({ valid: false, message: 'Erreur réseau' });
    } finally {
      setScanning(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 rounded-lg p-2">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">Contrôleur</p>
              <p className="text-xs text-slate-400">{user.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <ScanLine className="h-4 w-4 text-emerald-500" />
              Vérifier un billet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-slate-300">Code de contrôle</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: BG-A1B2C3D4"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  className="bg-slate-700 border-slate-600 text-white font-mono"
                  autoFocus
                />
                <Button
                  onClick={handleValidate}
                  disabled={scanning || !code.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Vérifier'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultat */}
        {result && (
          <Card className={
            result.valid
              ? 'bg-emerald-900/30 border-emerald-600'
              : 'bg-rose-900/30 border-rose-600'
          }>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {result.valid ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-rose-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-bold ${result.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.message}
                  </p>
                  {result.ticket && (
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      <p><span className="text-slate-400">Passager:</span> {result.ticket.passengerName}</p>
                      <p><span className="text-slate-400">Siège:</span> {result.ticket.seatNumber}</p>
                      <p><span className="text-slate-400">Destination:</span> {result.ticket.destination}</p>
                      {result.ticket.paperTicketNumber && (
                        <p><span className="text-slate-400">Ticket papier:</span> {result.ticket.paperTicketNumber}</p>
                      )}
                      {result.departure && (
                        <p><span className="text-slate-400">Ligne:</span> {result.departure.lineNumber}</p>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          result.ticket.ticketStatus === 'BOARDED' ? 'text-emerald-400 border-emerald-600' :
                          result.ticket.ticketStatus === 'ACTIVE' ? 'text-blue-400 border-blue-600' :
                          'text-rose-400 border-rose-600'
                        }
                      >
                        {result.ticket.ticketStatus}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-sm text-slate-300">
                Historique ({history.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-700 pb-1">
                    {h.valid ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <X className="h-3 w-3 text-rose-500" />
                    )}
                    <span>{h.ticket?.passengerName || 'Inconnu'}</span>
                    <span className="ml-auto">{h.ticket?.seatNumber || '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
