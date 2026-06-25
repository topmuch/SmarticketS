'use client';

/**
 * DepartureTimer — Compte à rebours avant le départ.
 *
 * Adapté de BusGo departure-timer.tsx pour SmarticketS.
 *
 * Affiche le temps restant avant le départ et déclenche des callbacks
 * à des moments clés (T-15, T-5, T-2) pour les annonces vocales.
 *
 * Props:
 *   - scheduledTime: ISO string de l'heure de départ
 *   - onT15?: callback appelé à T-15min (embarquement commence)
 *   - onT5?: callback appelé à T-5min (imminent)
 *   - onT2?: callback appelé à T-2min (dernier appel)
 *   - onDeparted?: callback appelé à l'heure de départ
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, AlertCircle, CheckCircle2, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartureTimerProps {
  scheduledTime: string;
  delayMinutes?: number;
  onT15?: () => void;
  onT5?: () => void;
  onT2?: () => void;
  onDeparted?: () => void;
  className?: string;
}

type Phase = 'far' | 't15' | 't5' | 't2' | 'departed' | 'delayed';

const PHASE_INFO: Record<Phase, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  far: { label: 'Programmé', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  t15: { label: 'Embarquement', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Bell },
  t5: { label: 'Imminent', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: AlertCircle },
  t2: { label: 'Dernier appel', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: AlertCircle },
  departed: { label: 'Parti', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
  delayed: { label: 'Retardé', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: AlertCircle },
};

export function DepartureTimer({
  scheduledTime,
  delayMinutes = 0,
  onT15,
  onT5,
  onT2,
  onDeparted,
  className,
}: DepartureTimerProps) {
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute departure time with delay
  const departureDate = new Date(scheduledTime);
  if (delayMinutes > 0) {
    departureDate.setMinutes(departureDate.getMinutes() + delayMinutes);
  }
  const departureMs = departureDate.getTime();
  const diffMs = departureMs - now;
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);

  // Determine current phase
  let phase: Phase = 'far';
  if (delayMinutes > 0 && diffMs <= 0) {
    phase = 'delayed';
  } else if (diffMs <= 0) {
    phase = 'departed';
  } else if (diffMin <= 2) {
    phase = 't2';
  } else if (diffMin <= 5) {
    phase = 't5';
  } else if (diffMin <= 15) {
    phase = 't15';
  }

  // Fire callbacks once per phase
  useEffect(() => {
    const fire = (key: string, cb?: () => void) => {
      if (cb && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        cb();
      }
    };

    if (phase === 't15') fire('t15', onT15);
    if (phase === 't5') fire('t5', onT5);
    if (phase === 't2') fire('t2', onT2);
    if (phase === 'departed') fire('departed', onDeparted);
  }, [phase, onT15, onT5, onT2, onDeparted]);

  const info = PHASE_INFO[phase];
  const Icon = info.icon;

  // Format display
  const formatTime = () => {
    if (diffMs <= 0) {
      return delayMinutes > 0 ? `+${delayMinutes}min` : 'Départ';
    }
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}h ${m.toString().padStart(2, '0')}min`;
    }
    if (diffMin > 0) {
      return `${diffMin}min ${diffSec.toString().padStart(2, '0')}s`;
    }
    return `${diffSec}s`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 flex items-center gap-3',
        info.bg,
        info.color,
        className
      )}
    >
      <Icon className={cn('h-6 w-6 shrink-0', phase === 't5' || phase === 't2' ? 'animate-pulse' : '')} />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-wide opacity-70">
            {info.label}
          </span>
          {delayMinutes > 0 && phase !== 'departed' && (
            <span className="text-xs bg-rose-200 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded">
              +{delayMinutes}min retard
            </span>
          )}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {formatTime()}
        </div>
      </div>
      <div className="text-right text-xs opacity-70">
        <div>Départ prévu</div>
        <div className="font-medium">
          {departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
