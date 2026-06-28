'use client';

/**
 * SeatMap — Plan visuel du bus avec sélection de sièges.
 *
 * Adapté de BusGo seat-map.tsx pour SmarticketS.
 *
 * Affiche les sièges du bus en grid (2+2 layout typique).
 * Couleurs selon le statut du passager :
 *   - empty (gris) : siège libre
 *   - active (bleu) : billet vendu, pas encore embarqué
 *   - boarded (vert) : passager embarqué
 *   - absent (rouge) : passager marqué absent
 *   - cancelled (gris strié) : billet annulé
 *
 * Props:
 *   - totalSeats: nombre total de sièges
 *   - tickets: liste des PassengerTicket (avec seatNumber + status)
 *   - onSeatClick?: callback quand on clique sur un siège occupé
 */

import { cn } from '@/lib/utils';
import { Users, UserCheck, UserX, X } from 'lucide-react';

export interface SeatTicket {
  id: string;
  seatNumber: string;
  passengerName: string;
  ticketStatus: string; // ACTIVE, BOARDED, ABSENT, CANCELLED
}

interface SeatMapProps {
  totalSeats: number;
  tickets: SeatTicket[];
  onSeatClick?: (ticket: SeatTicket) => void;
  selectedSeatId?: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  ACTIVE: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'À embarquer',
  },
  BOARDED: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-400 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Embarqué',
  },
  ABSENT: {
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    border: 'border-rose-400 dark:border-rose-700',
    text: 'text-rose-700 dark:text-rose-300',
    label: 'Absent',
  },
  CANCELLED: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-500 dark:text-gray-500 line-through',
    label: 'Annulé',
  },
  EMPTY: {
    bg: 'bg-gray-50 dark:bg-gray-900/10',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-400 dark:text-gray-600',
    label: 'Libre',
  },
};

export function SeatMap({ totalSeats, tickets, onSeatClick, selectedSeatId }: SeatMapProps) {
  // Build seat map: seatNumber → ticket
  const seatMap = new Map<string, SeatTicket>();
  tickets.forEach((t) => {
    seatMap.set(t.seatNumber, t);
  });

  // Generate seat numbers 1..N
  const seats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNum = String(i + 1);
    return {
      number: seatNum,
      ticket: seatMap.get(seatNum) || null,
    };
  });

  // Layout: 2 seats + aisle + 2 seats (4 per row)
  const rows: Array<Array<{ number: string; ticket: SeatTicket | null }>> = [];
  for (let i = 0; i < seats.length; i += 4) {
    const row: Array<{ number: string; ticket: SeatTicket | null }> = [];
    // Left pair
    if (seats[i]) row.push(seats[i]);
    if (seats[i + 1]) row.push(seats[i + 1]);
    // Aisle marker (null)
    row.push({ number: '__aisle__', ticket: null });
    // Right pair
    if (seats[i + 2]) row.push(seats[i + 2]);
    if (seats[i + 3]) row.push(seats[i + 3]);
    rows.push(row);
  }

  // Stats
  const stats = {
    boarded: tickets.filter((t) => t.ticketStatus === 'BOARDED').length,
    active: tickets.filter((t) => t.ticketStatus === 'ACTIVE').length,
    absent: tickets.filter((t) => t.ticketStatus === 'ABSENT').length,
    cancelled: tickets.filter((t) => t.ticketStatus === 'CANCELLED').length,
  };

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
          <span>À embarquer ({stats.active})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
          <span>Embarqué ({stats.boarded})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-rose-100 border border-rose-400" />
          <span>Absent ({stats.absent})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
          <span>Libre ({totalSeats - tickets.length})</span>
        </div>
      </div>

      {/* Bus container */}
      <div className="bg-muted/30 rounded-2xl p-4 border-2 border-border">
        {/* Driver area */}
        <div className="flex justify-center mb-3">
          <div className="bg-background border rounded-t-2xl px-8 py-1 text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-medium">🚌 Conducteur</span>
          </div>
        </div>

        {/* Seats grid */}
        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-2">
              {row.map((seat, seatIdx) => {
                if (seat.number === '__aisle__') {
                  return <div key={seatIdx} className="w-4" aria-hidden />;
                }

                const status = seat.ticket?.ticketStatus || 'EMPTY';
                const colors = STATUS_COLORS[status] || STATUS_COLORS.EMPTY;
                const isSelected = selectedSeatId === seat.ticket?.id;
                const isOccupied = !!seat.ticket;

                return (
                  <button
                    key={seatIdx}
                    type="button"
                    disabled={!isOccupied}
                    onClick={() => seat.ticket && onSeatClick?.(seat.ticket)}
                    className={cn(
                      'w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center transition-all',
                      'text-xs font-medium',
                      colors.bg,
                      colors.border,
                      colors.text,
                      isOccupied && 'cursor-pointer hover:scale-105 hover:shadow-md',
                      !isOccupied && 'cursor-default',
                      isSelected && 'ring-2 ring-primary ring-offset-1',
                      status === 'CANCELLED' && 'opacity-50'
                    )}
                    title={
                      isOccupied
                        ? `Siège ${seat.number} — ${seat.ticket!.passengerName} (${colors.label})`
                        : `Siège ${seat.number} — Libre`
                    }
                  >
                    <span className="font-bold leading-none">{seat.number}</span>
                    {isOccupied && (
                      <span className="text-[9px] leading-none mt-0.5">
                        {status === 'BOARDED' && '✓'}
                        {status === 'ABSENT' && '✗'}
                        {status === 'CANCELLED' && '—'}
                        {status === 'ACTIVE' && '•'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Back of bus */}
        <div className="flex justify-center mt-3">
          <div className="bg-background border rounded-b-2xl px-8 py-1 text-xs text-muted-foreground">
            Arrière du bus
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
          <div className="font-bold text-blue-700 dark:text-blue-300">{stats.active}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Users className="h-3 w-3" /> À embarquer
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
          <div className="font-bold text-emerald-700 dark:text-emerald-300">{stats.boarded}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <UserCheck className="h-3 w-3" /> Embarqués
          </div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2">
          <div className="font-bold text-rose-700 dark:text-rose-300">{stats.absent}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <UserX className="h-3 w-3" /> Absents
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-2">
          <div className="font-bold text-gray-700 dark:text-gray-300">{stats.cancelled}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <X className="h-3 w-3" /> Annulés
          </div>
        </div>
      </div>
    </div>
  );
}
