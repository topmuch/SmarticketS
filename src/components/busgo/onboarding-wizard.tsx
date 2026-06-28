'use client';

/**
 * BusGo Onboarding Wizard — Affiché à la 1ère connexion du transporteur.
 *
 * 4 étapes:
 *   1. Bienvenue (présentation BusGo)
 *   2. Messages vocaux (config TTS + upload ding-dong)
 *   3. Premier trajet (créer un départ + agent)
 *   4. Équipe (créer guichetier + contrôleur)
 *
 * Persistance: localStorage('busgo_onboarded')
 */

import { useState, useEffect } from 'react';
import {
  Bus, Volume2, Clock, Users, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, Upload, X, Rocket, Ticket, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BusGoOnboardingProps {
  open: boolean;
  onClose: () => void;
}

export function BusGoOnboarding({ open, onClose }: BusGoOnboardingProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Étape 2: voix
  const [voiceForm, setVoiceForm] = useState({
    messageH130Text: 'Embarquement pour {destination} à {heure}. En cas de retard, contactez l\'agent au {agentPhone}.',
    messageH5Text: 'Embarquement imminent pour {destination}. Veuillez vous présenter au quai {platform}.',
    messageDepartText: 'Le bus pour {destination} part maintenant. Bon voyage.',
  });

  // Étape 3: trajet
  const [trajetForm, setTrajetForm] = useState({
    lineNumber: '',
    destination: '',
    scheduledTime: '',
    totalSeats: 45,
    agentName: '',
    agentPhone: '',
  });

  // Étape 4: équipe
  const [equipeForm, setEquipeForm] = useState({
    guichetierName: '', guichetierEmail: '', guichetierPassword: '',
    controllerName: '', controllerEmail: '', controllerPassword: '',
  });

  const steps = [
    { title: 'Bienvenue', icon: Bus, color: 'text-amber-600' },
    { title: 'Messages vocaux', icon: Volume2, color: 'text-blue-600' },
    { title: 'Premier trajet', icon: Clock, color: 'text-emerald-600' },
    { title: 'Équipe', icon: Users, color: 'text-violet-600' },
  ];

  const handleSaveVoice = async () => {
    setLoading(true);
    try {
      await fetch('/api/busgo/voix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(voiceForm),
      });
      toast.success('Messages vocaux configurés !');
      setStep(3);
    } catch {
      toast.error('Erreur, mais vous pouvez continuer');
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrajet = async () => {
    if (!trajetForm.lineNumber || !trajetForm.destination || !trajetForm.scheduledTime) {
      toast.error('Ligne, destination et heure requises');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/busgo/trajets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(trajetForm),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Trajet créé !');
      setStep(4);
    } catch {
      toast.error('Erreur, mais vous pouvez continuer');
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEquipe = async () => {
    setLoading(true);
    const promises = [];

    if (equipeForm.guichetierName && equipeForm.guichetierEmail && equipeForm.guichetierPassword) {
      promises.push(
        fetch('/api/busgo/equipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: equipeForm.guichetierName,
            email: equipeForm.guichetierEmail,
            password: equipeForm.guichetierPassword,
            role: 'agent',
          }),
        })
      );
    }

    if (equipeForm.controllerName && equipeForm.controllerEmail && equipeForm.controllerPassword) {
      promises.push(
        fetch('/api/busgo/equipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: equipeForm.controllerName,
            email: equipeForm.controllerEmail,
            password: equipeForm.controllerPassword,
            role: 'controller',
          }),
        })
      );
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises);
        toast.success('Équipe créée !');
      } catch {
        toast.error('Erreur, mais vous pouvez continuer');
      }
    }

    setLoading(false);
    localStorage.setItem('busgo_onboarded', 'true');
    onClose();
    toast.success('🎉 Configuration terminée ! Bienvenue sur BusGo.');
  };

  const handleSkip = () => {
    localStorage.setItem('busgo_onboarded', 'true');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-amber-600 text-white rounded-lg p-1.5">
              <Bus className="h-5 w-5" />
            </div>
            BusGo — Configuration
          </DialogTitle>
          <DialogDescription>
            Étape {step + 1} sur {steps.length}: {steps[step]?.title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-amber-600' : 'bg-muted'
                }`}
              />
            );
          })}
        </div>

        {/* Step 0: Bienvenue */}
        {step === 0 && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 w-fit">
              <Rocket className="h-12 w-12 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bienvenue sur BusGo !</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Le système de transport en bus avec notifications vocales.
                Configurons votre compagnie en 3 étapes rapides.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/50 rounded-lg p-3">
                <Volume2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="font-medium">Messages vocaux</p>
                <p className="text-muted-foreground">H-1h30, H-5min, départ</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="font-medium">Trajets</p>
                <p className="text-muted-foreground">Créez vos départs</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Users className="h-5 w-5 text-violet-600 mx-auto mb-1" />
                <p className="font-medium">Équipe</p>
                <p className="text-muted-foreground">Guichetier, contrôleur</p>
              </div>
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setStep(1)}>
              Commencer <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button onClick={handleSkip} className="text-xs text-muted-foreground hover:underline">
              Passer l'configuration
            </button>
          </div>
        )}

        {/* Step 1: Voix */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Configurez vos messages vocaux</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Ces messages seront envoyés aux passagers par notification vocale.
              Variables: {'{destination}'} {'{heure}'} {'{platform}'} {'{agentPhone}'}
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Message H-1h30 (envoyé 1h30 avant le départ)</Label>
                <Textarea
                  value={voiceForm.messageH130Text}
                  onChange={(e) => setVoiceForm({ ...voiceForm, messageH130Text: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message H-5min (envoyé 5 min avant)</Label>
                <Textarea
                  value={voiceForm.messageH5Text}
                  onChange={(e) => setVoiceForm({ ...voiceForm, messageH5Text: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message départ (à l'heure du départ)</Label>
                <Textarea
                  value={voiceForm.messageDepartText}
                  onChange={(e) => setVoiceForm({ ...voiceForm, messageDepartText: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleSaveVoice} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer et continuer'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Trajet */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              <h3 className="font-medium">Créez votre premier trajet</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Numéro de ligne *</Label>
                <Input placeholder="Ex: Ligne 1" value={trajetForm.lineNumber} onChange={(e) => setTrajetForm({ ...trajetForm, lineNumber: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination *</Label>
                <Input placeholder="Ex: Saint-Louis" value={trajetForm.destination} onChange={(e) => setTrajetForm({ ...trajetForm, destination: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date et heure *</Label>
                <Input type="datetime-local" value={trajetForm.scheduledTime} onChange={(e) => setTrajetForm({ ...trajetForm, scheduledTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sièges</Label>
                <Input type="number" min="1" max="200" value={trajetForm.totalSeats} onChange={(e) => setTrajetForm({ ...trajetForm, totalSeats: parseInt(e.target.value) || 45 })} />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium mb-2">Agent assigné (optionnel)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom agent</Label>
                  <Input placeholder="Ex: Moussa Sow" value={trajetForm.agentName} onChange={(e) => setTrajetForm({ ...trajetForm, agentName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Téléphone agent</Label>
                  <Input placeholder="Ex: 77 123 45 67" value={trajetForm.agentPhone} onChange={(e) => setTrajetForm({ ...trajetForm, agentPhone: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleCreateTrajet} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le trajet'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Équipe */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              <h3 className="font-medium">Ajoutez votre équipe</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Créez des comptes pour vos guichetiers et contrôleleurs. Vous pouvez passer cette étape.
            </p>

            {/* Guichetier */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Guichetier</span>
              </div>
              <Input placeholder="Nom" value={equipeForm.guichetierName} onChange={(e) => setEquipeForm({ ...equipeForm, guichetierName: e.target.value })} />
              <Input type="email" placeholder="Email" value={equipeForm.guichetierEmail} onChange={(e) => setEquipeForm({ ...equipeForm, guichetierEmail: e.target.value })} />
              <Input type="password" placeholder="Mot de passe" value={equipeForm.guichetierPassword} onChange={(e) => setEquipeForm({ ...equipeForm, guichetierPassword: e.target.value })} />
            </div>

            {/* Contrôleur */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Contrôleur</span>
              </div>
              <Input placeholder="Nom" value={equipeForm.controllerName} onChange={(e) => setEquipeForm({ ...equipeForm, controllerName: e.target.value })} />
              <Input type="email" placeholder="Email" value={equipeForm.controllerEmail} onChange={(e) => setEquipeForm({ ...equipeForm, controllerEmail: e.target.value })} />
              <Input type="password" placeholder="Mot de passe" value={equipeForm.controllerPassword} onChange={(e) => setEquipeForm({ ...equipeForm, controllerPassword: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleCreateEquipe} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Terminer'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
