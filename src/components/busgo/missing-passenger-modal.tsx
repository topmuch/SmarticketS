'use client';

/**
 * MissingPassengerModal — Alerte modale pour un passager manquant.
 *
 * Adapté de BusGo missing-passenger-modal.tsx pour SmarticketS.
 *
 * S'affiche automatiquement à T-5min si des passagers ne sont pas encore
 * embarqués. L'agent peut :
 *   - Appeler le passager (lien tel:)
 *   - Marquer comme absent
 *   - Marquer comme embarqué (au cas où il serait présent mais pas scanné)
 *   - Ignorer (reporte l'alerte de 60 secondes)
 */

import { useState } from 'react';
import { Phone, UserX, UserCheck, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export interface MissingPassenger {
  id: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  destination: string;
  controlCode: string;
}

interface MissingPassengerModalProps {
  passengers: MissingPassenger[];
  minutesToDeparture: number;
  onMarkAbsent: (ticketId: string) => void;
  onMarkBoarded: (ticketId: string) => void;
  onSnooze: () => void;
  onClose: () => void;
}

export function MissingPassengerModal({
  passengers,
  minutesToDeparture,
  onMarkAbsent,
  onMarkBoarded,
  onSnooze,
  onClose,
}: MissingPassengerModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = (id: string, action: 'absent' | 'boarded') => {
    setProcessingId(id);
    if (action === 'absent') {
      onMarkAbsent(id);
    } else {
      onMarkBoarded(id);
    }
    setTimeout(() => setProcessingId(null), 500);
  };

  const isUrgent = minutesToDeparture <= 2;

  return (
    <Dialog open={passengers.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            {passengers.length} passager{passengers.length > 1 ? 's' : ''} manquant{passengers.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            {isUrgent ? (
              <span className="text-rose-600 font-medium">
                ⚠️ Départ dans {minutesToDeparture} minute{minutesToDeparture > 1 ? 's' : ''} !
              </span>
            ) : (
              <span>Départ dans {minutesToDeparture} minutes</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {passengers.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.passengerName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Siège {p.seatNumber}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      → {p.destination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                <a href={`tel:${p.passengerPhone}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Appeler
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  disabled={processingId === p.id}
                  onClick={() => handleAction(p.id, 'boarded')}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Présent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-300 hover:bg-rose-50"
                  disabled={processingId === p.id}
                  onClick={() => handleAction(p.id, 'absent')}
                >
                  <UserX className="h-3 w-3 mr-1" />
                  Absent
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onSnooze}>
            <Clock className="h-4 w-4 mr-1" />
            Rappeler dans 1 min
          </Button>
          <Button variant="default" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
