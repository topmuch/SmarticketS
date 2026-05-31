'use client';

import React, { useState, useCallback } from 'react';
import {
  ArrowRightLeft,
  Trash2,
  Zap,
  Package,
  Ticket,
  MapPin,
  User,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

export interface BaggageType {
  id: string;
  reference: string;
  category: 'parcel' | 'ticket' | 'hajj';
  status: string;
  stationId?: string | null;
  station?: { id: string; name: string } | null;
  travelerFirstName?: string | null;
  travelerLastName?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

type BaggageAction = 'assign' | 'transfer' | 'delete' | 'activate';

interface BaggageTableProps {
  baggages: BaggageType[];
  onSelectionChange?: (ids: string[]) => void;
  showStation?: boolean;
  actions?: BaggageAction[];
  emptyMessage?: string;
}

/* ══════════════════════════════════════════════════════════
   Helpers — Category badge styling
   ══════════════════════════════════════════════════════════ */

const categoryConfig: Record<
  string,
  { label: string; className: string }
> = {
  ticket: {
    label: 'Ticket',
    className:
      'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  parcel: {
    label: 'Colis',
    className:
      'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  hajj: {
    label: 'Hajj',
    className:
      'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

/* ══════════════════════════════════════════════════════════
   Helpers — Status badge styling
   ══════════════════════════════════════════════════════════ */

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending_activation: {
    label: 'En attente',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  pending: {
    label: 'En attente',
    className:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  active: {
    label: 'Actif',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  scanned: {
    label: 'Scanné',
    className:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  in_transit: {
    label: 'En transit',
    className:
      'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  delivered: {
    label: 'Livré',
    className:
      'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  lost: {
    label: 'Perdu',
    className:
      'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  found: {
    label: 'Trouvé',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  blocked: {
    label: 'Bloqué',
    className:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
};

function getCategoryBadge(category: string) {
  const config = categoryConfig[category] || {
    label: category,
    className: 'border-slate-300 bg-slate-50 text-slate-600',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  const config = statusConfig[status] || {
    label: status,
    className: 'border-slate-300 bg-slate-50 text-slate-600',
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════
   Category icon helper
   ══════════════════════════════════════════════════════════ */

function getCategoryIcon(category: string) {
  switch (category) {
    case 'ticket':
      return <Ticket className="w-3.5 h-3.5 text-violet-500" />;
    case 'parcel':
      return <Package className="w-3.5 h-3.5 text-orange-500" />;
    case 'hajj':
      return <Package className="w-3.5 h-3.5 text-green-500" />;
    default:
      return <Package className="w-3.5 h-3.5 text-slate-400" />;
  }
}

/* ══════════════════════════════════════════════════════════
   Action button renderer
   ══════════════════════════════════════════════════════════ */

function ActionButtons({
  actions,
  baggage,
}: {
  actions: BaggageAction[];
  baggage: BaggageType;
}) {
  return (
    <div className="flex items-center gap-1">
      {actions.includes('assign') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-[#FF1D8D] hover:bg-[#FF1D8D]/10"
          title="Assigner à une gare"
        >
          <MapPin className="w-3.5 h-3.5" />
        </Button>
      )}
      {actions.includes('transfer') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          title="Transférer"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </Button>
      )}
      {actions.includes('activate') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          title="Activer"
        >
          <Zap className="w-3.5 h-3.5" />
        </Button>
      )}
      {actions.includes('delete') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Date formatter
   ══════════════════════════════════════════════════════════ */

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */

export function BaggageTable({
  baggages,
  onSelectionChange,
  showStation = false,
  actions = [],
  emptyMessage = 'Aucun colis trouvé',
}: BaggageTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── Selection logic ── */

  const handleToggleOne = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange]
  );

  const handleToggleAll = useCallback(() => {
    const allIds = baggages.map((b) => b.id);
    setSelectedIds((prev) => {
      // If all are selected, deselect all; otherwise select all
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      const next = allSelected ? new Set<string>() : new Set(allIds);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  }, [baggages, onSelectionChange]);

  const isAllSelected =
    baggages.length > 0 && baggages.every((b) => selectedIds.has(b.id));

  /* ── Empty state ── */

  if (baggages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-8 text-center">
        <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Scrollable table wrapper for mobile */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
            <TableRow className="hover:bg-transparent">
              {/* Selection column */}
              {onSelectionChange && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleToggleAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
              )}

              {/* Référence */}
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Référence
              </TableHead>

              {/* Catégorie */}
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Catégorie
              </TableHead>

              {/* Statut */}
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Statut
              </TableHead>

              {/* Gare (optional) */}
              {showStation && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Gare
                </TableHead>
              )}

              {/* Voyageur */}
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Voyageur
              </TableHead>

              {/* Créé le */}
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Créé le
              </TableHead>

              {/* Actions */}
              {actions.length > 0 && (
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[130px]">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {baggages.map((baggage) => (
              <TableRow
                key={baggage.id}
                className={`transition-colors ${
                  selectedIds.has(baggage.id)
                    ? 'bg-[#FF1D8D]/5 dark:bg-[#FF1D8D]/10'
                    : ''
                }`}
              >
                {/* Selection checkbox */}
                {onSelectionChange && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(baggage.id)}
                      onCheckedChange={() => handleToggleOne(baggage.id)}
                      aria-label={`Sélectionner ${baggage.reference}`}
                    />
                  </TableCell>
                )}

                {/* Référence */}
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {baggage.reference}
                  </span>
                </TableCell>

                {/* Catégorie */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(baggage.category)}
                    {getCategoryBadge(baggage.category)}
                  </div>
                </TableCell>

                {/* Statut */}
                <TableCell>{getStatusBadge(baggage.status)}</TableCell>

                {/* Gare (optional) */}
                {showStation && (
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[120px]">
                        {baggage.station?.name || '—'}
                      </span>
                    </div>
                  </TableCell>
                )}

                {/* Voyageur */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[100px]">
                      {baggage.travelerFirstName || baggage.travelerLastName
                        ? `${baggage.travelerFirstName || ''} ${baggage.travelerLastName || ''}`.trim()
                        : '—'}
                    </span>
                  </div>
                </TableCell>

                {/* Créé le */}
                <TableCell>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(baggage.createdAt)}
                  </span>
                </TableCell>

                {/* Actions */}
                {actions.length > 0 && (
                  <TableCell>
                    <ActionButtons
                      actions={actions}
                      baggage={baggage}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer count */}
      <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {baggages.length} élément{baggages.length > 1 ? 's' : ''}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-[#FF1D8D] font-semibold">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export default BaggageTable;
