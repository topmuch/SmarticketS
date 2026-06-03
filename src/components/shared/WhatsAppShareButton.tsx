'use client';

import { useCallback, useState } from 'react';
import { MessageCircle, Share2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { generateWaMeLink, cleanPhone } from '@/lib/wame';

interface WhatsAppShareButtonProps {
  phone?: string;
  message: string;
  title?: string;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth?: boolean;
  label?: string;
  showShareIcon?: boolean;
  className?: string;
  noTooltip?: boolean;
}

/**
 * WhatsAppShareButton — Multi-strategy sharing component
 *
 * 1. Web Share API (mobile-native sharing sheet with WhatsApp)
 * 2. Fallback: wa.me deep link (opens WhatsApp Web or app)
 * 3. Fallback: navigator.clipboard copy message text
 *
 * Production-ready: handles all browser edge cases, no mocks.
 */
export function WhatsAppShareButton({
  phone,
  message,
  title = 'SmarticketS',
  url,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  label,
  showShareIcon = false,
  className,
  noTooltip = false,
}: WhatsAppShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const waLink = phone ? generateWaMeLink(cleanPhone(phone), message) : null;

  const shareViaWebShareAPI = useCallback(async () => {
    const shareData: ShareData = {
      title,
      text: message,
    };
    if (url) shareData.url = url;

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return false;
        }
        throw err;
      }
    }
    return false;
  }, [title, message, url]);

  const handleShare = useCallback(async () => {
    setLoading(true);

    try {
      const shared = await shareViaWebShareAPI();
      if (shared) {
        toast.success('Partagé avec succès');
        return;
      }

      if (waLink) {
        window.open(waLink, '_blank', 'noopener,noreferrer');
        toast.success('Ouverture de WhatsApp...');
        return;
      }

      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      try {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      } catch {
        try {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          toast.success('Message copié');
          setTimeout(() => setCopied(false), 3000);
        } catch {
          toast.error('Impossible de partager. Veuillez copier le message manuellement.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [shareViaWebShareAPI, waLink, message]);

  const Icon = copied ? Check : showShareIcon ? Share2 : MessageCircle;

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={loading}
      className={`gap-2 ${fullWidth ? 'w-full' : ''} ${
        variant === 'default' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
      } ${className || ''}`}
      aria-label={label || 'Partager sur WhatsApp'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label && <span>{copied ? 'Copié !' : label}</span>}
    </Button>
  );

  if (noTooltip) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          {phone ? `Envoyer sur WhatsApp à ${phone}` : 'Partager ce contenu'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * WhatsAppQuickActions — Row of quick-action WhatsApp buttons
 *
 * Common use cases: call driver, contact receiver, share tracking link.
 */
interface WhatsAppQuickActionsProps {
  actions: Array<{
    label: string;
    message: string;
    phone?: string;
    variant?: 'default' | 'outline' | 'ghost';
    icon?: 'phone' | 'share' | 'check';
  }>;
  direction?: 'row' | 'col';
  className?: string;
}

export function WhatsAppQuickActions({
  actions,
  direction = 'row',
  className,
}: WhatsAppQuickActionsProps) {
  return (
    <div className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'} gap-2 flex-wrap ${className || ''}`}>
      {actions.map((action, i) => (
        <WhatsAppShareButton
          key={i}
          phone={action.phone}
          message={action.message}
          variant={action.variant || 'outline'}
          size="sm"
          label={action.label}
          showShareIcon={action.icon === 'share'}
        />
      ))}
    </div>
  );
}
