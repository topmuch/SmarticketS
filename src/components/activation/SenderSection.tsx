'use client';

import { Phone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SenderSectionProps {
  senderName: string;
  setSenderName: (v: string) => void;
  senderPhone: string;
  setSenderPhone: (v: string) => void;
  phoneError: string | null;
  lang: 'fr' | 'en';
}

export default function SenderSection({
  senderName, setSenderName,
  senderPhone, setSenderPhone,
  phoneError,
  lang,
}: SenderSectionProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-[#25D366]">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        📤 {t("L'ENVOYEUR", 'THE SENDER')}
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sender_name" className="text-sm font-medium text-[#4B5563]">
            {t('Nom Complet', 'Full Name')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="sender_name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder={t('Ex: Moussa Diop', 'Ex: Moussa Diop')}
            className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm"
            aria-required="true"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sender_phone" className="text-sm font-medium text-[#4B5563]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Numéro WhatsApp
            </span>
            <span className="text-red-500"> *</span>
          </Label>
          <Input
            id="sender_phone"
            type="tel"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="+221 77 123 45 67"
            className={`h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm font-mono ${phoneError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            aria-required="true"
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? 'sender-phone-error' : 'sender-phone-help'}
          />
          <p id={phoneError ? 'sender-phone-error' : 'sender-phone-help'} className={`text-xs ${phoneError ? 'text-red-500' : 'text-gray-400'}`} role={phoneError ? 'alert' : undefined}>
            {phoneError || t('Recevra la confirmation de départ.', 'Will receive the departure confirmation.')}
          </p>
        </div>
      </div>
    </div>
  );
}
