'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SmartPhoneInput from './SmartPhoneInput';

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
    <div className="bg-[#8b5cf6] rounded-2xl p-6 shadow-lg shadow-violet-500/20">
      <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
        📥 {t('DESTINATAIRE', 'RECEIVER')}
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="receiver_name" className="text-sm font-medium text-violet-100">
            {t('Nom Complet', 'Full Name')} <span className="text-yellow-300">*</span>
          </Label>
          <Input
            id="receiver_name"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder={t('Ex: Fatou Sow', 'Ex: Fatou Sow')}
            className="h-12 bg-white/95 border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm text-gray-900 placeholder:text-gray-400"
            aria-required="true"
          />
        </div>

        <SmartPhoneInput
          label={t('Numéro WhatsApp', 'WhatsApp Number')}
          value={receiverPhone}
          onChange={(v) => setReceiverPhone(v)}
          hint={t('Recevra le code de retrait par WhatsApp.', 'Will receive the pickup code via WhatsApp.')}
          error={phoneError}
          name="receiver_phone"
        />
      </div>
    </div>
  );
}
