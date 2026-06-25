'use client';

/**
 * Agent Embarquement (index) — Redirige vers le dashboard ou affiche un scanner QR.
 *
 * Cette page est un placeholder pour la Phase 2 (page embarquement détaillée).
 * Pour l'instant, elle affiche un scanner QR simple qui redirige vers la page
 * du départ correspondant.
 */

import Link from 'next/link';
import { ScanLine, Bus, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AgentEmbarquementIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Embarquement</h1>
        <p className="text-muted-foreground">
          Sélectionnez un trajet pour gérer l&apos;embarquement des passagers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/agent">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Trajets du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Voir les départs programmés aujourd&apos;hui et accéder à l&apos;embarquement.
              </p>
              <Button variant="ghost" className="mt-3 p-0 h-auto">
                Accéder <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-emerald-600" />
              Scanner un billet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Le scanner QR sera disponible dans la Phase 2 de l&apos;intégration.
            </p>
            <Link href="/controller/validate">
              <Button variant="outline" size="sm">
                Utiliser le scanner existant
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Bus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            La page d&apos;embarquement détaillée (avec plan de sièges, liste passagers,
            statut boarded/absent) sera ajoutée en Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
