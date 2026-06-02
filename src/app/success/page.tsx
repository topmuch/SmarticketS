// @ts-nocheck
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, QrCode, Download, Home, Luggage, Plane, Share2, Calendar, Phone, MapPin } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import SuccessOverlay from '@/components/ui/SuccessOverlay';
import { useTranslation } from '@/hooks/useTranslation';

interface ActivationData {
  reference: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  flightNumber?: string;
  destination?: string;
  type: string;
  activatedAt: string;
  expiresAt?: string;
  // TRANSPORT-FEATURE: Transport mode + conditional fields
  transportMode?: string;
  trainNumber?: string;
  shipName?: string;
  busLineNumber?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qrRef = useRef<HTMLDivElement>(null);
  const type = searchParams.get('type') || 'voyageur';

  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activationConfirmed, setActivationConfirmed] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const { t } = useTranslation();

  const isHajj = type === 'hajj';
  const bgColor = isHajj ? 'from-[#0d5e34] to-[#0a4a2a]' : 'from-[#d35400] to-[#b34700]';
  const accentColor = isHajj ? '#0d5e34' : '#d35400';

  useEffect(() => {
    // Load activation data from sessionStorage
    const storedData = sessionStorage.getItem('activationData');
    if (storedData) {
      try {
        setActivationData(JSON.parse(storedData));
      } catch (e) {
        console.error('Error parsing activation data:', e);
      }
    }
  }, []);

  // Trigger SuccessOverlay once activation data is loaded
  useEffect(() => {
    if (activationData) {
      setActivationConfirmed(true);
    }
  }, [activationData]);

  // Generate QR URL
  const qrUrl = activationData?.reference
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${activationData.reference}`
    : '';

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format expiration date
  const formatExpiration = (dateString?: string) => {
    if (!dateString) return isHajj ? '60 jours' : 'Selon formule';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Download proof as image
  const handleDownloadProof = async () => {
    if (!qrRef.current || !activationData) return;

    setIsDownloading(true);

    try {
      // Create a canvas from the QR code div
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Set canvas size (A4 ratio-ish for proof)
      canvas.width = 800;
      canvas.height = 1000;

      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isHajj) {
        gradient.addColorStop(0, '#0d5e34');
        gradient.addColorStop(1, '#0a4a2a');
      } else {
        gradient.addColorStop(0, '#d35400');
        gradient.addColorStop(1, '#b34700');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw white card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 20);
      ctx.fill();

      // Draw header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Activation Réussie', canvas.width / 2, 100);

      // Draw SmarticketS logo text
      ctx.font = 'bold 24px Arial';
      ctx.fillText('SmarticketS', canvas.width / 2, 150);

      // Draw QR code area (white background)
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, canvas.width / 2 - 100, 180, 200, 200, 10);
      ctx.fill();

      // Draw QR code using SVG to Image
      const svgElement = qrRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, canvas.width / 2 - 80, 200, 160, 160);
          URL.revokeObjectURL(svgUrl);

          // Continue drawing text after QR code
          drawTextContent();
        };
        img.src = svgUrl;
      } else {
        drawTextContent();
      }

      function drawTextContent() {
        // Reference
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(activationData.reference, canvas.width / 2, 430);

        // Traveler name
        ctx.font = '20px Arial';
        ctx.fillText(`${activationData.firstName} ${activationData.lastName}`, canvas.width / 2, 470);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(60, 500);
        ctx.lineTo(canvas.width - 60, 500);
        ctx.stroke();

        // Details
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        const details = [
          `📱 WhatsApp: ${activationData.whatsapp}`,
          // TRANSPORT-FEATURE: Dynamic transport detail in download proof
          (() => {
            const mode = activationData.transportMode || 'flight';
            if (mode === 'flight' && activationData.flightNumber) return `✈️ Vol: ${activationData.flightNumber}`;
            if (mode === 'train' && activationData.trainNumber) return `🚆 Train: ${activationData.trainNumber}`;
            if (mode === 'boat' && activationData.shipName) return `🚢 Navire: ${activationData.shipName}`;
            if (mode === 'bus' && activationData.busLineNumber) return `🚌 Bus: ${activationData.busLineNumber}`;
            return null;
          })(),
          activationData.destination ? `📍 Destination: ${activationData.destination}` : null,
          `📅 Activé le: ${formatDate(activationData.activatedAt)}`,
          `⏰ Expire le: ${formatExpiration(activationData.expiresAt)}`,
        ].filter(Boolean);

        let yPos = 550;
        details.forEach(detail => {
          ctx.fillText(detail || '', 80, yPos);
          yPos += 35;
        });

        // Type badge
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(isHajj ? '✈️ Hajj - Pèlerinage' : '🧳 Voyageur', canvas.width / 2, 780);

        // Footer
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('SmarticketS - Protégez vos colis, en toute sérénité', canvas.width / 2, 850);
        ctx.fillText('www.smartickets.com', canvas.width / 2, 880);

        // Download
        const link = document.createElement('a');
        link.download = `SmarticketS-${activationData.reference}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setIsDownloading(false);
      }

    } catch (error) {
      console.error('Error generating proof:', error);
      setIsDownloading(false);
      alert('Erreur lors de la génération de la preuve. Veuillez réessayer.');
    }
  };

  // Helper function to draw rounded rectangles
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Share proof
  const handleShare = async () => {
    if (!activationData) return;

    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/activate/${activationData.reference}` : '';
    const shareData = {
      title: 'SmarticketS - Preuve d\'activation',
      text: `Mon colis ${activationData.reference} est protégé par SmarticketS. Voici votre lien de suivi :`,
      url: trackingUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(trackingUrl);
      alert('Lien copié dans le presse-papiers !');
    }
  };

  // No activation data
  if (!activationData) {
    return (
      <main className={`min-h-screen bg-gradient-to-b ${bgColor} flex items-center justify-center p-4`}>
        <div className="max-w-md w-full">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Activation réussie !</h1>
              <p className="text-white/70 mb-6">
                {isHajj ? 'Vos 3 colis sont maintenant protégés' : 'Votre colis est maintenant protégé'}
              </p>
              <Link href="/" className="block">
                <Button className="w-full bg-white text-[#0d5e34] hover:bg-white/90">
                  <Home className="w-4 h-4 mr-2" />
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-gradient-to-b ${bgColor} flex items-center justify-center p-4`}>
      {/* SuccessOverlay — Premium activation confirmation */}
      <SuccessOverlay show={activationConfirmed} messageKey="activation.success" t={t} />

      <div className="max-w-md w-full">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
          <CardContent className="pt-8 pb-8">
            {/* Success Animation */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-white/10 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Activation réussie ! 🎉
              </h1>
              <p className="text-white/70">
                {isHajj
                  ? 'Vos 3 colis sont maintenant protégés'
                  : 'Votre colis est maintenant protégé'}
              </p>
            </div>

            {/* QR Code Card */}
            <div
              ref={qrRef}
              className="bg-white rounded-xl p-4 mb-6 text-center"
            >
              <QRCodeSVG
                value={qrUrl}
                size={160}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor={accentColor}
              />
              <p className="text-gray-800 font-mono font-bold mt-2 text-lg">
                {activationData.reference}
              </p>
              <p className="text-gray-500 text-sm">
                {activationData.firstName} {activationData.lastName}
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-white/10 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                {isHajj ? (
                  <Plane className="w-5 h-5 text-white flex-shrink-0" />
                ) : (
                  <Luggage className="w-5 h-5 text-white flex-shrink-0" />
                )}
                <div>
                  <p className="text-white font-medium">
                    {isHajj ? '3 colis activés' : '1 colis activé'}
                  </p>
                  <p className="text-white/60 text-sm">
                    {isHajj ? 'Protection Hajj 2025' : 'Protection active'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">
                    Expire le {formatExpiration(activationData.expiresAt)}
                  </p>
                  <p className="text-white/60 text-sm">
                    Activé le {formatDate(activationData.activatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">
                    {activationData.whatsapp}
                  </p>
                  <p className="text-white/60 text-sm">
                    Numéro de contact
                  </p>
                </div>
              </div>

              {/* TRANSPORT-FEATURE: Destination info with dynamic transport context */}
              {activationData.destination && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-white flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">
                      {activationData.destination}
                    </p>
                    <p className="text-white/60 text-sm">
                      {(() => {
                        const mode = activationData.transportMode || 'flight';
                        const icons: Record<string, string> = { flight: '✈️', train: '🚆', boat: '🚢', bus: '🚌' };
                        const labels: Record<string, string> = { flight: 'Avion', train: 'Train', boat: 'Bateau', bus: 'Bus' };
                        return `${icons[mode] || '✈️'} ${labels[mode] || 'Avion'}`;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Button */}
            <Button
              className="w-full bg-white/20 hover:bg-white/30 text-white mb-3"
              variant="outline"
              onClick={handleDownloadProof}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger la preuve d&apos;activation
                </>
              )}
            </Button>

            {/* Share Button */}
            <Button
              className="w-full bg-white/10 hover:bg-white/20 text-white mb-4"
              variant="ghost"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>

            {/* Tracking Link Block */}
            <div className="mt-6 p-4 bg-white/10 border border-white/20 rounded-xl">
              <p className="text-sm text-white/90 font-medium mb-2">
                🔗 Votre lien de suivi unique :
              </p>
              <a
                href={`/activate/${activationData.reference}`}
                className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/20 transition-colors group mb-2"
              >
                <span className="flex-1 text-sm text-orange-300 truncate font-mono">
                  {typeof window !== 'undefined' ? `${window.location.origin}/activate/${activationData.reference}` : `/activate/${activationData.reference}`}
                </span>
                <span className="text-xs text-white/50 group-hover:text-white transition-colors flex-shrink-0">
                  Ouvrir ↗
                </span>
              </a>
              <div className="flex items-center gap-2">
                <a
                  href={`/activate/${activationData.reference}`}
                  className="flex-1 text-center px-3 py-2 text-sm bg-white hover:bg-white/90 text-[#0d5e34] rounded-lg transition-colors font-semibold"
                >
                  📍 Suivre mon colis
                </a>
                <button 
                  onClick={() => {
                    const link = `${window.location.origin}/activate/${activationData.reference}`;
                    navigator.clipboard.writeText(link);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  className="px-3 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium flex-shrink-0 border border-white/20"
                >
                  {copyFeedback ? '✅ Copié !' : '📋 Copier'}
                </button>
              </div>
              <p className="text-xs text-white/60 mt-2">
                En cas de perte, cliquez sur le lien pour suivre votre colis en temps réel.
              </p>
            </div>

            {/* Home Button */}
            <Link href="/" className="block">
              <Button
                className="w-full text-white font-semibold"
                style={{ backgroundColor: isHajj ? '#ffffff' : '#b8860b', color: isHajj ? accentColor : '#ffffff' }}
              >
                <Home className="w-4 h-4 mr-2" />
                Retour à l&apos;accueil
              </Button>
            </Link>

            {/* Tips */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <h3 className="text-white font-medium mb-3 text-sm">Conseils :</h3>
              <ul className="space-y-2 text-white/60 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  Collez le sticker sur une surface visible de votre colis
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  Évitez les zones qui s&apos;usent facilement (poignées, roues)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  Testez le scan avant votre départ
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-white/50 text-sm">
          <p>Un problème ? <a href="mailto:contact@smartickets.com" className="underline">contact@smartickets.com</a></p>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-[#d35400] to-[#b34700] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
