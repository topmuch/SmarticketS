'use client';

/**
 * BusGo Guichet Onboarding — Tooltip overlay pour la 1ère visite du guichetier.
 *
 * Affiche des bulles d'aide qui pointent vers les éléments de la page:
 *   1. "Sélectionnez un départ ici"
 *   2. "Saisissez les infos du passager"
 *   3. "Cliquez Vendre → le QR s'affiche"
 */

import { useState, useEffect } from 'react';
import { Bus, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function BusGoGuichetOnboarding({ open, onDismiss }: Props) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Bienvenue au Guichet !',
      content: 'Ici vous vendez des billets à partir des tickets papier pré-imprimés. Voici comment ça marche en 3 étapes.',
      icon: Bus,
    },
    {
      title: '1. Sélectionnez un départ',
      content: 'Cliquez sur un départ dans la liste de gauche. Choisissez celui qui correspond au trajet du client.',
      icon: Bus,
    },
    {
      title: '2. Saisissez les infos',
      content: 'Remplissez: n° du ticket papier (référence imprimée), nom, téléphone et n° de siège du passager.',
      icon: Bus,
    },
    {
      title: '3. Vendez et affichez le QR',
      content: 'Cliquez "Vendre le billet". Un QR code s\'affiche — faites-le scanner par le passager pour installer la PWA sur son téléphone.',
      icon: Bus,
    },
    {
      title: 'C\'est tout ! 🎉',
      content: 'Le passager recevra automatiquement des notifications vocales 1h30 et 5min avant le départ. Vous pouvez voir les départs et stats dans le Dashboard.',
      icon: Bus,
    },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-amber-600 text-white rounded-lg p-1.5">
              <current.icon className="h-4 w-4" />
            </div>
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-sm pt-2">
            {current.content}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-amber-600' : i < step ? 'bg-amber-300' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
              Retour
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => setStep(step + 1)}>
              Suivant <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={onDismiss}>
              Commencer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
