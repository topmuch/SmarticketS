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
    <div className="bg-[#158c2d] rounded-2xl p-6">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        📥 {t('DESTINATAIRE', 'RECEIVER')}
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="receiver_name" className="text-sm font-medium text-white/90">
            {t('Nom Complet', 'Full Name')} <span className="text-yellow-300">*</span>
          </Label>
          <Input
            id="receiver_name"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder={t('Ex: Fatou Sow', 'Ex: Fatou Sow')}
            className="h-12 bg-white border-[#158c2d]/30 focus-visible:ring-white/40 focus-visible:border-white/50 text-sm text-gray-800 placeholder:text-gray-400"
            aria-required="true"
          />
        </div>

        <SmartPhoneInput
          label="Numéro WhatsApp"
          value={receiverPhone}
          onChange={(v) => setReceiverPhone(v)}
          hint={t('Recevra le code de retrait par WhatsApp.', 'Will receive the pickup code via WhatsApp.')}
          error={phoneError}
          name="receiver_phone"
          labelClassName="text-white/90"
          hintClassName="text-white/60"
        />
      </div>
    </div>
  );
}
