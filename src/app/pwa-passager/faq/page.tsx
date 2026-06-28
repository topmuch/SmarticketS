'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, Bell, ScanLine, Clock, Phone, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FAQ_ITEMS = [
  {
    icon: Bell,
    question: 'Quand vais-je recevoir les notifications ?',
    answer: 'Vous recevrez 3 notifications: 1h30 avant le départ (avec le numéro de l\'agent), 5 minutes avant (embarquement imminent), et à l\'heure du départ (le bus part).',
  },
  {
    icon: ScanLine,
    question: 'Comment embarquer dans le bus ?',
    answer: 'Ouvrez l\'app → cliquez "Scanner le QR de l\'agent" → scannez le QR code affiché par l\'agent à l\'entrée du bus. Vous serez marqué comme embarqué.',
  },
  {
    icon: Clock,
    question: 'Que faire si je suis en retard ?',
    answer: 'Appelez l\'agent (bouton "Appeler l\'agent" sur le dashboard). L\'agent peut vous accorder un délai de 5 minutes. Votre chronomètre sera réinitialisé.',
  },
  {
    icon: Phone,
    question: 'Comment contacter le chauffeur ?',
    answer: 'Le numéro de l\'agent est affiché sur votre dashboard. Cliquez sur "Appeler l\'agent" pour l\'appeler directement, ou allez dans "Messages" pour lui envoyer un texto.',
  },
  {
    icon: Bus,
    question: 'Le bus est en retard, que faire ?',
    answer: 'Le statut du voyage passera en orange "Retardé" avec la durée du retard. Le chronomètre s\'ajuste automatiquement. Vous n\'avez rien à faire.',
  },
  {
    icon: Bell,
    question: 'Je ne reçois pas de notifications',
    answer: 'Allez dans Paramètres → activez "Notifications push". Sur iPhone: Réglages > BusGo > Notifications. Sur Android: autorisez les notifications dans le navigateur.',
  },
];

export default function PwaPassagerFaqPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pwa-passager')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-600" />
            FAQ & Aide
          </h1>
        </div>

        {FAQ_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4 text-amber-600" />
                  {item.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          );
        })}

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-amber-800">Besoin d'aide supplémentaire ?</p>
            <p className="text-xs text-amber-700 mt-1">Contactez le support: support@busgo.sn</p>
            <Button variant="outline" className="mt-3" onClick={() => router.push('/pwa-passager/settings')}>
              Paramètres
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
