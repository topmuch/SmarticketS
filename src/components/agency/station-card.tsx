'use client';

import React from 'react';
import {
  MapPin,
  ChevronRight,
  QrCode,
  CheckCircle2,
  Zap,
  Building2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface StationCardStation {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string | null;
  isActive: boolean;
}

interface StationCardStats {
  total: number;
  pending: number;
  active: number;
  todayActivations: number;
}

interface StationCardProps {
  station: StationCardStation;
  stats: StationCardStats;
  onClick: () => void;
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */

export function StationCard({ station, stats, onClick }: StationCardProps) {
  return (
    <Card
      className={`
        group relative transition-all duration-200
        hover:shadow-md hover:border-[#FF1D8D]/30
        cursor-pointer
        ${!station.isActive ? 'opacity-60' : ''}
      `}
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div
        className={`
          absolute top-0 left-0 right-0 h-1 rounded-t-xl
          ${station.isActive ? 'bg-[#FF1D8D]' : 'bg-slate-300 dark:bg-slate-600'}
        `}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Icon + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`
                shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                ${
                  station.isActive
                    ? 'bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20'
                    : 'bg-slate-100 dark:bg-slate-800'
                }
              `}
            >
              <Building2
                className={`w-5 h-5 ${
                  station.isActive
                    ? 'text-[#FF1D8D]'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </div>

            <div className="min-w-0">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white truncate">
                {station.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {station.city}
                  {station.address ? ` — ${station.address}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Active badge */}
          <Badge
            variant="outline"
            className={`
              shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide
              ${
                station.isActive
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }
            `}
          >
            {station.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 pt-0">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* QR Assignés */}
          <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2 py-2.5">
            <div className="flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-[#FF1D8D]" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                QR Assignés
              </span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
              {stats.total}
            </span>
          </div>

          {/* Disponibles (pending) */}
          <div className="flex flex-col items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2 py-2.5">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-tight">
                Disponibles
              </span>
            </div>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300 leading-none">
              {stats.pending}
            </span>
          </div>

          {/* Activés Aujourd'hui */}
          <div className="flex flex-col items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-2 py-2.5">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">
                Activés
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-none">
              {stats.todayActivations}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <Button
          variant="ghost"
          className="w-full justify-between text-[#FF1D8D] hover:text-[#FF1D8D] hover:bg-[#FF1D8D]/10 text-sm font-medium"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Voir détails
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default StationCard;
