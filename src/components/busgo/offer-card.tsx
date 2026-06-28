'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Tag, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  partnerName: string;
  actionUrl: string;
  actionLabel: string;
  targetAudience: string;
  priority: number;
}

interface OfferCardProps {
  offer: Offer;
  variant?: 'card' | 'banner' | 'list';
  onDismiss?: () => void;
}

export function OfferCard({ offer, variant = 'card', onDismiss }: OfferCardProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = async () => {
    setClicked(true);
    try {
      await fetch('/api/busgo/offers/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.id }),
      });
    } catch { /* non-blocking */ }

    // Handle WhatsApp links specially
    if (offer.actionUrl.includes('wa.me') || offer.actionUrl.includes('whatsapp')) {
      const msg = encodeURIComponent(`Bonjour, je viens de voir votre offre "${offer.title}" sur Bus Go...`);
      const url = offer.actionUrl.includes('?')
        ? `${offer.actionUrl}&text=${msg}`
        : `${offer.actionUrl}?text=${msg}`;
      window.open(url, '_blank');
    } else {
      window.open(offer.actionUrl, '_blank');
    }

    setTimeout(() => setClicked(false), 2000);
  };

  // ─── Banner variant (minimal, for controller) ─────────────
  if (variant === 'banner') {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        {offer.imageUrl && (
          <img src={offer.imageUrl} alt={offer.partnerName} className="h-8 w-8 rounded object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate">{offer.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{offer.partnerName}</p>
        </div>
        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 shrink-0">
          Sponsorisé
        </Badge>
        <ExternalLink className="h-3 w-3 text-amber-600 shrink-0" />
      </button>
    );
  }

  // ─── List variant (compact, for agent) ─────────────────────
  if (variant === 'list') {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors text-left"
      >
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt={offer.partnerName} className="h-10 w-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Tag className="h-5 w-5 text-amber-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{offer.title}</p>
          <p className="text-xs text-muted-foreground truncate">{offer.description}</p>
        </div>
        <span className="text-xs font-medium text-amber-600 shrink-0">{offer.actionLabel}</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>
    );
  }

  // ─── Card variant (full, for passenger dashboard) ──────────
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow relative group">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="flex">
        {offer.imageUrl && (
          <div className="w-20 h-20 shrink-0">
            <img src={offer.imageUrl} alt={offer.partnerName} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="flex-1 p-3">
          <div className="flex items-center gap-1 mb-1">
            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
              Sponsorisé
            </Badge>
            <span className="text-[10px] text-muted-foreground">{offer.partnerName}</span>
          </div>
          <p className="text-sm font-medium leading-tight">{offer.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{offer.description}</p>
          <button
            onClick={handleClick}
            className={cn(
              'mt-2 text-xs font-medium px-3 py-1 rounded-full transition-colors',
              clicked ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'
            )}
          >
            {clicked ? '✓ Ouvert' : offer.actionLabel}
          </button>
        </CardContent>
      </div>
    </Card>
  );
}

// ─── Offer List (horizontal scroll for passenger) ─────────────
export function OfferList({ offers, variant = 'card' }: { offers: Offer[]; variant?: 'card' | 'list' | 'banner' }) {
  if (!offers || offers.length === 0) return null;

  if (variant === 'banner' || variant === 'list') {
    return (
      <div className="space-y-2">
        {offers.map(offer => <OfferCard key={offer.id} offer={offer} variant={variant} />)}
      </div>
    );
  }

  // Horizontal scroll for cards
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {offers.map(offer => (
        <div key={offer.id} className="min-w-[260px] max-w-[280px]">
          <OfferCard offer={offer} variant="card" />
        </div>
      ))}
    </div>
  );
}

// ─── Hook: fetch offers by role ───────────────────────────────
export function useSponsoredOffers(role: 'passenger' | 'agent' | 'controller' | 'all' = 'all') {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/busgo/offers?role=${role}`)
      .then(res => res.json())
      .then(data => setOffers(data.data || []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [role]);

  return { offers, loading };
}
