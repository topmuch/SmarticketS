'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Volume2, Download, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function PwaPassagerSettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [language, setLanguage] = useState('fr');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('busgo_passenger_settings');
    if (saved) {
      const s = JSON.parse(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(s.notifications ?? true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSound(s.sound ?? true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(s.language ?? 'fr');
    }
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const save = (key: string, value: boolean | string) => {
    const settings = { notifications, sound, language, [key]: value };
    localStorage.setItem('busgo_passenger_settings', JSON.stringify(settings));
    toast.success('Paramètres enregistrés');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifications(true);
        save('notifications', true);
        toast.success('Notifications activées');
      } else {
        toast.error('Permissions refusées');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pwa-passager')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Paramètres</h1>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-amber-600" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notifications push</Label>
                <p className="text-xs text-muted-foreground">Recevoir les alertes d'embarquement</p>
              </div>
              <Switch checked={notifications} onCheckedChange={(v) => { setNotifications(v); save('notifications', v); if (v) handleEnableNotifications(); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Sons d'alerte</Label>
                <p className="text-xs text-muted-foreground">Ding-dong avant les messages vocaux</p>
              </div>
              <Switch checked={sound} onCheckedChange={(v) => { setSound(v); save('sound', v); }} />
            </div>
            <Button variant="outline" className="w-full" onClick={handleEnableNotifications}>
              <Bell className="h-4 w-4 mr-2" /> Activer les notifications
            </Button>
          </CardContent>
        </Card>

        {/* Langue */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-blue-600" /> Langue</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button size="sm" variant={language === 'fr' ? 'default' : 'outline'} onClick={() => { setLanguage('fr'); save('language', 'fr'); }} className={language === 'fr' ? 'bg-amber-600' : ''}>
                🇫🇷 Français
              </Button>
              <Button size="sm" variant={language === 'en' ? 'default' : 'outline'} onClick={() => { setLanguage('en'); save('language', 'en'); }} className={language === 'en' ? 'bg-amber-600' : ''}>
                🇬🇧 English
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Installation PWA */}
        {deferredPrompt && (
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4 text-amber-600" /> Installer l'application</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Ajoutez BusGo à votre écran d'accueil pour un accès rapide et les notifications même quand l'app est fermée.</p>
              <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" /> Installer sur mon téléphone
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" /> Support client</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>📧 Email: support@busgo.sn</p>
            <p>📞 Téléphone: +221 77 000 00 00</p>
            <p>💬 WhatsApp: +221 77 000 00 00</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
