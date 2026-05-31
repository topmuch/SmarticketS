'use client';

import React, { useState, useMemo } from 'react';
import { MapPin, Search, Building2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface Station {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  slug: string;
  isActive: boolean;
  [key: string]: unknown;
}

interface SelectStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations: Station[];
  onSelect: (station: Station) => void;
  /** Pre-selected station IDs — shown with a check indicator */
  selectedIds?: string[];
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */

export function SelectStationDialog({
  open,
  onOpenChange,
  stations,
  onSelect,
  selectedIds = [],
}: SelectStationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Filter stations by search ── */
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;

    const q = searchQuery.toLowerCase().trim();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [stations, searchQuery]);

  /* ── Handle station click ── */
  const handleSelect = (station: Station) => {
    onSelect(station);
    onOpenChange(false);
    // Reset search on close
    setSearchQuery('');
  };

  /* ── Reset search when dialog opens ── */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-xl bg-[#FF1D8D]/10 dark:bg-[#FF1D8D]/20 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-[#FF1D8D]" />
            </div>
            <span>
              Assigner à une gare
              {selectedIds.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({selectedIds.length} QR)
                </span>
              )}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sélectionnez la gare à laquelle assigner les codes QR.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher une gare..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800" />

        {/* Station list */}
        <ScrollArea className="max-h-[320px]">
          {filteredStations.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'Aucune gare trouvée'
                  : 'Aucune gare disponible'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredStations.map((station) => {
                const isPreselected = selectedIds.includes(station.id);

                return (
                  <button
                    key={station.id}
                    onClick={() => handleSelect(station)}
                    className={`
                      w-full text-left px-6 py-3 flex items-center gap-3
                      transition-colors duration-150
                      hover:bg-slate-50 dark:hover:bg-slate-800/50
                      ${!station.isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    disabled={!station.isActive}
                  >
                    {/* Station icon */}
                    <div
                      className={`
                        shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                        ${
                          isPreselected
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }
                      `}
                    >
                      {isPreselected ? (
                        <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Building2 className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    {/* Station info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {station.name}
                        </span>
                        {!station.isActive && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-slate-300 dark:border-slate-600 text-slate-400"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {station.city}
                          {station.address ? ` — ${station.address}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg
                      className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            {filteredStations.length} gare{filteredStations.length !== 1 ? 's' : ''} disponible{filteredStations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SelectStationDialog;
