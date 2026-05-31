'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface KpiCardProps {
  /** Label displayed above the value */
  title: string;
  /** The main number displayed prominently */
  value: string | number;
  /** Icon rendered on the left side of the card */
  icon: React.ReactNode;
  /** Optional trend indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Optional short description below the value */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'neutral' }) {
  if (!trend || trend === 'neutral') {
    return (
      <Minus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
    );
  }

  if (trend === 'up') {
    return (
      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
    );
  }

  return (
    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
  );
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */

export function KpiCard({
  title,
  value,
  icon,
  trend,
  description,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-md py-0 gap-0',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
              bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20
              text-[#FF1D8D]
              transition-colors group-hover:bg-[#FF1D8D]/15
            `}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {title}
            </p>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {value}
              </span>

              {trend && (
                <span className="flex items-center gap-0.5">
                  <TrendIcon trend={trend} />
                </span>
              )}
            </div>

            {description && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default KpiCard;
