/**
 * WhatsAppOnboarding — Reusable component for sending staff onboarding via WhatsApp.
 *
 * Features:
 * - Shows generated code (masked by default, click to reveal)
 * - "Envoyer par WhatsApp" button → opens wa.me with pre-filled message
 * - "Copier le message" button → copies to clipboard
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { buildOnboardingWaLink, buildWhatsappMessage, maskPhone } from '@/lib/whatsapp';
import { ROLE_LABELS } from '@/lib/rbac';
import { toast } from 'sonner';

interface WhatsAppOnboardingProps {
  /** Staff member's name */
  name: string;
  /** E.164 phone number */
  phone: string;
  /** Staff role (for message template) */
  role: string;
  /** The 4-digit login code (plain text, shown only once) */
  code: string;
  /** PWA installation URL */
  pwaUrl: string;
  /** Compact mode for inline usage */
  compact?: boolean;
}

export default function WhatsAppOnboarding({
  name,
  phone,
  role,
  code,
  pwaUrl,
  compact = false,
}: WhatsAppOnboardingProps) {
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  const message = buildWhatsappMessage({ name, code, role: roleLabel, pwaUrl });
  const waLink = buildOnboardingWaLink(phone, { name, code, role: roleLabel, pwaUrl });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCodeRevealed(!codeRevealed);
          }}
          className="text-xs"
        >
          {codeRevealed ? (
            <><EyeOff className="w-3 h-3 mr-1" /> Masquer</>
          ) : (
            <><Eye className="w-3 h-3 mr-1" /> Code: {codeRevealed ? code : '****'}</>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700">
            <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Onboarding WhatsApp
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {maskPhone(phone)}
          </p>
        </div>
      </div>

      {/* Code Display */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Code :</span>
          <span className="font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-slate-100">
            {codeRevealed ? code : '••••'}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCodeRevealed(!codeRevealed)}
        >
          {codeRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => window.open(waLink, '_blank')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Envoyer par WhatsApp
          <ExternalLink className="w-3 h-3 ml-2" />
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? (
            <><Check className="w-4 h-4 mr-2 text-green-500" /> Copié</>
          ) : (
            <><Copy className="w-4 h-4 mr-2" /> Copier</>
          )}
        </Button>
      </div>

      {/* Message Preview */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto">
        <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
          {message}
        </pre>
      </div>
    </div>
  );
}
