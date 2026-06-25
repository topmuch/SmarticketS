'use client';

/**
 * BusGo PWA Terrain — QR codes pour télécharger les apps.
 *
 * Affiche 2 QR codes:
 *   1. PWA Passager — pour que les passagers téléchargent l'app
 *   2. PWA Agent — pour que les agents téléchargent l'app
 */

import { Smartphone, Bus, Shield, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BusGoPwaTerrainPage() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PWA Terrain</h1>
        <p className="text-muted-foreground">
          Affichez ces QR codes pour que les passagers et agents téléchargent les apps.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* PWA Passager */}
        <Card className="border-2 border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-amber-600 text-white rounded-lg p-2">
                <Bus className="h-5 w-5" />
              </div>
              PWA Passager
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white p-4 rounded-xl inline-block border-2 border-amber-200">
              <QRCodeSVG
                value={`${baseUrl}/pwa-passager`}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="text-sm space-y-2">
              <p className="font-medium">📱 Application Passager</p>
              <p className="text-xs text-muted-foreground">
                Le passager scanne ce QR → ouvre la PWA → installe sur son téléphone.
                Reçoit les notifications vocales avant l'embarquement.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-left">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Fonctionnalités:</p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <li>✅ Billet digital (numéro, siège, destination)</li>
                  <li>✅ Notifications vocales (H-1h30, H-5min, départ)</li>
                  <li>✅ Chronomètre avant départ</li>
                  <li>✅ Contact agent (appel direct)</li>
                  <li>✅ Scanner QR agent (embarquement)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Agent */}
        <Card className="border-2 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-emerald-600 text-white rounded-lg p-2">
                <Smartphone className="h-5 w-5" />
              </div>
              PWA Agent (Embarquement)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white p-4 rounded-xl inline-block border-2 border-emerald-200">
              <QRCodeSVG
                value={`${baseUrl}/busgo/embarquement`}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="text-sm space-y-2">
              <p className="font-medium">📱 Application Agent</p>
              <p className="text-xs text-muted-foreground">
                L'agent scanne ce QR → se connecte → gère l'embarquement.
                Affiche le QR code à scanner par les passagers.
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-left">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Fonctionnalités:</p>
                <ul className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                  <li>✅ QR code agent à afficher</li>
                  <li>✅ Liste des passagers en temps réel</li>
                  <li>✅ Détection des absents</li>
                  <li>✅ Bouton "Retard client +5min"</li>
                  <li>✅ Annonces vocales (TTS)</li>
                  <li>✅ Statistiques embarquement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Contrôleur */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                <Shield className="h-5 w-5" />
              </div>
              PWA Contrôleur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white p-4 rounded-xl inline-block border-2 border-blue-200">
              <QRCodeSVG
                value={`${baseUrl}/pwa-controleur`}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="text-sm space-y-2">
              <p className="font-medium">📱 Application Contrôleur</p>
              <p className="text-xs text-muted-foreground">
                Le contrôleur scanne ce QR → se connecte → vérifie les billets.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-left">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Fonctionnalités:</p>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li>✅ Vérification des billets (controlCode)</li>
                  <li>✅ Affichage nom, siège, destination</li>
                  <li>✅ Statut (embarqué, actif, annulé)</li>
                  <li>✅ Historique des contrôles</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Comment installer les PWA ?</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                  <li>Scanner le QR code avec l'appareil photo du téléphone</li>
                  <li>Ouvrir le lien dans le navigateur (Chrome/Safari)</li>
                  <li>Se connecter avec les identifiants fournis</li>
                  <li>Ajouter à l'écran d'accueil (menu navigateur → "Installer")</li>
                  <li>L'app apparaît sur le téléphone comme une app native</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
