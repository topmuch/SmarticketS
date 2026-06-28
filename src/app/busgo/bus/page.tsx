'use client';

import { Bus, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function BusGoBusPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flotte de bus</h1>
          <p className="text-muted-foreground">Gérez vos véhicules.</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bus
        </Button>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <Bus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            La gestion de la flotte sera disponible prochainement.
            Pour l&apos;instant, les bus sont gérés via les départs et leurs capacités.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
