'use client';

import { Phone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ReceiverSectionProps {
  receiverName: string;
  setReceiverName: (v: string) => void;
  receiverPhone: string;
  setReceiverPhone: (v: string) => void;
  phoneError: string | null;
  lang: 'fr' | 'en';
}

export default function ReceiverSection({
  receiverName, setReceiverName,
  receiverPhone, setReceiverPhone,
  phoneError,
  lang,
}: ReceiverSectionProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-[#0077B6]">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        📥 {t('LE RECEVEUR', 'THE RECEIVER')}
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="receiver_name" className="text-sm font-medium text-[#4B5563]">
            {t('Nom Complet', 'Full Name')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="receiver_name"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder={t('Ex: Fatou Sow', 'Ex: Fatou Sow')}
            className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm"
            aria-required="true"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="receiver_phone" className="text-sm font-medium text-[#4B5563]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Numéro WhatsApp
            </span>
            <span className="text-red-500"> *</span>
          </Label>
          <Input
            id="receiver_phone"
            type="tel"
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
            placeholder="+221 76 123 45 67"
            className={`h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm font-mono ${phoneError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            aria-required="true"
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? 'receiver-phone-error' : 'receiver-phone-help'}
          />
          <p id={phoneError ? 'receiver-phone-error' : 'receiver-phone-help'} className={`text-xs ${phoneError ? 'text-red-500' : 'text-gray-400'}`} role={phoneError ? 'alert' : undefined}>
            {phoneError || t('Recevra la notification d\'arrivée.', 'Will receive the arrival notification.')}
          </p>
        </div>
      </div>
    </div>
  );
}
