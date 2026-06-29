'use client';

/**
 * PWA AdsBanner — Carrousel de publicités/offres dans la PWA passager.
 *
 * Affiche les annonces postées par l'admin (images ET vidéos) sous forme
 * de carrousel auto-défilant. Les annonces sont récupérées via l'API
 * publique /api/busgo/offers?role=passenger (pas d'auth requise).
 *
 * Features:
 *   - Carrousel auto-défilant (5s par slide)
 *   - Support image (JPG/PNG) ET vidéo (MP4)
 *   - Indicateurs de position (dots)
 *   - Bouton d'action cliquable (wa.me, website, tel:)
 *   - Swipe manuel (flèches gauche/droite)
 *   - Tracking des clics (/api/busgo/offers/click)
 *   - Responsive (full width sur mobile)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdOffer {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  partnerName: string;
  actionUrl: string;
  actionLabel: string;
}

export function PwaAdsBanner() {
  const [ads, setAds] = useState<AdOffer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch ads
  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/offers?role=passenger');
      if (res.ok) {
        const data = await res.json();
        setAds(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAds]);

  // Auto-scroll carousel
  useEffect(() => {
    if (ads.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ads.length]);

  const goToSlide = (idx: number) => {
    setCurrentIdx(idx);
    // Reset timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentIdx((prev) => (prev + 1) % ads.length);
      }, 5000);
    }
  };

  const nextSlide = () => goToSlide((currentIdx + 1) % ads.length);
  const prevSlide = () => goToSlide((currentIdx - 1 + ads.length) % ads.length);

  const handleClick = (ad: AdOffer) => {
    // Track click
    fetch('/api/busgo/offers/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: ad.id }),
    }).catch(() => {});

    // Open action URL
    if (ad.actionUrl.startsWith('http') || ad.actionUrl.startsWith('wa.me') || ad.actionUrl.startsWith('tel:')) {
      const url = ad.actionUrl.startsWith('wa.me') ? `https://${ad.actionUrl}` : ad.actionUrl;
      window.open(url, '_blank');
    } else {
      window.open(ad.actionUrl, '_blank');
    }
  };

  // Don't render if no ads or loading
  if (loading || ads.length === 0) return null;

  const currentAd = ads[currentIdx];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg bg-slate-800">
      {/* Slides container */}
      <div className="relative h-40 sm:h-48">
        {ads.map((ad, idx) => (
          <div
            key={ad.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-500',
              idx === currentIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            {/* Media: video or image */}
            {ad.videoUrl ? (
              <video
                src={ad.videoUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{ad.partnerName}</span>
              </div>
            )}

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Text content */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <div className="flex items-end justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-orange-300 font-medium">{ad.partnerName}</p>
                  <h3 className="font-bold text-sm truncate">{ad.title}</h3>
                  <p className="text-xs text-white/80 line-clamp-1">{ad.description}</p>
                </div>
                <button
                  onClick={() => handleClick(ad)}
                  className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  {ad.actionLabel}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows (if > 1 ad) */}
      {ads.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            aria-label="Suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {ads.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === currentIdx ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/50'
                )}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
