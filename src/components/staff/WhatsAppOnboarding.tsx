/**
 * WhatsAppOnboarding — Reusable component for sending staff onboarding via WhatsApp.
 *
 * Features:
 * - Shows generated code (masked by default, click to reveal with eye icon)
 * - "Envoyer par WhatsApp" button → opens wa.me with pre-filled message
 * - "Copier le code" button → copies plain code to clipboard
 * - "Régénérer" optional callback
 * - Framer Motion reveal animation
 * - Sonner toast for copy success
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { buildWhatsappLink, buildOnboardingMessage } from '@/lib/whatsapp';
import { ROLE_LABELS } from '@/lib/rbac';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsAppOnboardingProps {
  /** Staff member's display name */
  staffName: string;
  /** E.164 phone number */
  phone: string;
  /** Staff role key (ADMIN, OPERATOR, etc.) */
  role: string;
  /** The 4-digit login code (plain text, shown only once) */
  code: string;
  /** Agency name for the WhatsApp message template */
  agencyName: string;
  /** PWA installation URL */
  pwaUrl: string;
  /** Optional callback for code regeneration */
  onRegenerate?: () => void;
}

export default function WhatsAppOnboarding({
  staffName,
  phone,
  role,
  code,
  agencyName,
  pwaUrl,
  onRegenerate,
}: WhatsAppOnboardingProps) {
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  const message = buildOnboardingMessage({
    name: staffName,
    role: roleLabel,
    code,
    agencyName,
    pwaUrl,
  });
  const waLink = buildWhatsappLink(phone, message);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le code');
    }
  };

  const handleSendWhatsApp = () => {
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Onboarding WhatsApp
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {phone}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-medium">
          {roleLabel}
        </Badge>
      </div>

      {/* Code Display */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Code :</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={codeRevealed ? 'revealed' : 'masked'}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-xl font-bold tracking-[0.3em] text-slate-900 dark:text-slate-100"
            >
              {codeRevealed ? code : '****'}
            </motion.span>
          </AnimatePresence>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setCodeRevealed(!codeRevealed)}
          className="h-11 w-11 shrink-0"
          title={codeRevealed ? 'Masquer le code' : 'Afficher le code'}
        >
          {codeRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
          onClick={handleSendWhatsApp}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          📱 Envoyer par WhatsApp
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11"
          onClick={handleCopyCode}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
              📋 Copié !
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              📋 Copier le code
            </>
          )}
        </Button>
        {onRegenerate && (
          <Button
            variant="outline"
            className="h-11"
            onClick={onRegenerate}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            🔄 Régénérer
          </Button>
        )}
      </div>

      {/* Message Preview */}
      <details className="group">
        <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          Aperçu du message WhatsApp ▾
        </summary>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 mt-2 max-h-32 overflow-y-auto">
          <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
            {message}
          </pre>
        </div>
      </details>
    </div>
  );
}
