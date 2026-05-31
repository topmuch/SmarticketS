'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SmartPhoneInput from './SmartPhoneInput';

interface SenderSectionProps {
  senderName: string;
  setSenderName: (v: string) => void;
  senderPhone: string;
  setSenderPhone: (v: string) => void;
  phoneError: string | null;
  lang: 'fr' | 'en';
  baggageType: string;
  setBaggageType: (v: string) => void;
  baggageTypeOther: string;
  setBaggageTypeOther: (v: string) => void;
  baggageWeight: string;
  setBaggageWeight: (v: string) => void;
  baggageDimensions: string;
  setBaggageDimensions: (v: string) => void;
  baggageColor: string;
  setBaggageColor: (v: string) => void;
  contentCategory: string;
  setContentCategory: (v: string) => void;
  declaredValue: string;
  setDeclaredValue: (v: string) => void;
  isFragile: boolean;
  setIsFragile: (v: boolean) => void;
  hasProhibited: boolean;
  setHasProhibited: (v: boolean) => void;
}

const BAGGAGE_TYPES = [
  { value: 'VALISE', label: '🧳 Valise', en: '🧳 Suitcase' },
  { value: 'SAC', label: '👜 Sac', en: '👜 Bag' },
  { value: 'CARTON', label: '📦 Carton', en: '📦 Box' },
  { value: 'BACKPACK', label: '🎒 Sac à dos', en: '🎒 Backpack' },
  { value: 'CABIN', label: '✈️ Bagage cabine', en: '✈️ Cabin bag' },
  { value: 'OTHER', label: '📦 Autre', en: '📦 Other' },
];

const CONTENT_CATEGORIES = [
  { value: 'CLOTHES', label: '👕 Vêtements', en: '👕 Clothes' },
  { value: 'DOCS', label: '📄 Documents', en: '📄 Documents' },
  { value: 'ELECTRONICS', label: '📱 Électronique', en: '📱 Electronics' },
  { value: 'FOOD', label: '🍲 Alimentaire', en: '🍲 Food' },
  { value: 'GIFTS', label: '🎁 Cadeaux', en: '🎁 Gifts' },
  { value: 'OTHER', label: '📦 Divers', en: '📦 Miscellaneous' },
];

export default function SenderSection({
  senderName, setSenderName,
  senderPhone, setSenderPhone,
  phoneError,
  lang,
  baggageType, setBaggageType,
  baggageTypeOther, setBaggageTypeOther,
  baggageWeight, setBaggageWeight,
  baggageDimensions, setBaggageDimensions,
  baggageColor, setBaggageColor,
  contentCategory, setContentCategory,
  declaredValue, setDeclaredValue,
  isFragile, setIsFragile,
  hasProhibited, setHasProhibited,
}: SenderSectionProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  return (
    <div className="bg-[#215ae2] rounded-2xl p-4 sm:p-6 shadow-lg shadow-[#215ae2]/20 border-2 border-dashed border-white/50">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
        📤 {t('EXPÉDITEUR & COLIS', 'SENDER & PACKAGE')}
      </h2>

      <div className="space-y-4 sm:space-y-6">
        {/* ─── Section A: Coordonnées Expéditeur ─── */}
        <div className="border-2 border-dashed border-white/50 rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2 sm:mb-3">
            👤 {t('Coordonnées Expéditeur', 'Sender Details')}
          </p>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sender_name" className="text-sm sm:text-base font-semibold text-white">
                {t('Nom Complet', 'Full Name')} <span className="text-yellow-300">*</span>
              </Label>
              <Input
                id="sender_name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t('Ex: Moussa Diop', 'Ex: Moussa Diop')}
                className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
                aria-required="true"
              />
            </div>

            <SmartPhoneInput
              label={t('Numéro WhatsApp', 'WhatsApp Number')}
              value={senderPhone}
              onChange={(v) => setSenderPhone(v)}
              hint={t('Recevra la confirmation de départ.', 'Will receive the departure confirmation.')}
              error={phoneError}
              name="sender_phone"
              labelClassName="text-white"
              hintClassName="text-white"
            />
          </div>
        </div>

        {/* ─── Section B: Type & Physique du Bagage ─── */}
        <div className="border-2 border-dashed border-white/50 rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2 sm:mb-3">
            📦 {t('Type & Physique du Bagage', 'Baggage Type & Physical')}
          </p>
          <div className="space-y-3 sm:space-y-4">
            {/* Baggage Type */}
            <div className="space-y-1.5">
              <Label className="text-sm sm:text-base font-semibold text-white">
                {t('Type de bagage', 'Baggage type')} <span className="text-yellow-300">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BAGGAGE_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setBaggageType(bt.value)}
                    aria-pressed={baggageType === bt.value}
                    className={`flex items-center justify-center h-11 sm:h-12 rounded-lg border-2 text-xs sm:text-sm font-bold transition-all px-1.5 sm:px-2 ${
                      baggageType === bt.value
                        ? 'border-white bg-white/25 text-white shadow-sm shadow-black/10'
                        : 'border-white/30 text-white hover:border-white/50'
                    }`}
                  >
                    {lang === 'fr' ? bt.label : bt.en}
                  </button>
                ))}
              </div>
              {baggageType === 'OTHER' && (
                <Input
                  value={baggageTypeOther}
                  onChange={(e) => setBaggageTypeOther(e.target.value)}
                  placeholder={t('Précisez le type...', 'Specify type...')}
                  className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
                  aria-required="true"
                />
              )}
            </div>

            {/* Weight / Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="baggage_weight" className="text-sm sm:text-base font-semibold text-white">
                  🏋️ {t('Poids', 'Weight')}
                </Label>
                <div className="relative">
                  <Input
                    id="baggage_weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={baggageWeight}
                    onChange={(e) => setBaggageWeight(e.target.value)}
                    placeholder="0.0"
                    className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-white font-semibold">kg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="baggage_color" className="text-sm sm:text-base font-semibold text-white">
                  🎨 {t('Couleur', 'Color')}
                </Label>
                <Input
                  id="baggage_color"
                  value={baggageColor}
                  onChange={(e) => setBaggageColor(e.target.value)}
                  placeholder={t('Noir, Bleu...', 'Black, Blue...')}
                  className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="baggage_dimensions" className="text-sm sm:text-base font-semibold text-white">
                📏 {t('Dimensions', 'Dimensions')}
              </Label>
              <Input
                id="baggage_dimensions"
                value={baggageDimensions}
                onChange={(e) => setBaggageDimensions(e.target.value)}
                placeholder={t('L x l x h en cm', 'L x W x H in cm')}
                className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* ─── Section C: Contenu & Valeur ─── */}
        <div className="border-2 border-dashed border-white/50 rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-2 sm:mb-3">
            📋 {t('Contenu & Valeur', 'Content & Value')}
          </p>
          <div className="space-y-3 sm:space-y-4">
            {/* Content Category */}
            <div className="space-y-1.5">
              <Label className="text-sm sm:text-base font-semibold text-white">
                {t('Catégorie du contenu', 'Content category')}
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setContentCategory(cat.value)}
                    aria-pressed={contentCategory === cat.value}
                    className={`flex items-center justify-center h-11 sm:h-12 rounded-lg border-2 text-xs sm:text-sm font-bold transition-all px-1.5 sm:px-2 ${
                      contentCategory === cat.value
                        ? 'border-white bg-white/25 text-white shadow-sm shadow-black/10'
                        : 'border-white/30 text-white hover:border-white/50'
                    }`}
                  >
                    {lang === 'fr' ? cat.label : cat.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Declared Value */}
            <div className="space-y-1.5">
              <Label htmlFor="declared_value" className="text-sm sm:text-base font-semibold text-white">
                💰 {t('Valeur déclarée', 'Declared value')} <span className="text-xs sm:text-sm text-white font-normal opacity-80">({t('optionnel', 'optional')})</span>
              </Label>
              <div className="relative">
                <Input
                  id="declared_value"
                  type="number"
                  step="100"
                  min="0"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  placeholder="0"
                  className="h-12 sm:h-14 !bg-white border-white/30 focus-visible:ring-white/50 focus-visible:border-white/60 text-sm sm:text-base text-gray-900 placeholder:text-gray-500 pr-14 sm:pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-white font-semibold">FCFA</span>
              </div>
            </div>

            {/* Toggles: Fragile / Prohibited — stacked on mobile */}
            <div className="space-y-3">
              {/* Fragile Toggle */}
              <div className="p-3 sm:p-3.5 bg-white/15 rounded-xl border border-white/20">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="text-base shrink-0">⚠️</span>
                    <div>
                      <Label className="text-sm sm:text-base font-semibold text-white cursor-pointer leading-snug">
                        {t('Objet fragile ?', 'Fragile item?')}
                      </Label>
                      <p className="text-xs sm:text-sm text-white/90">{t('Manutention avec précaution', 'Handle with care')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isFragile}
                    onClick={() => setIsFragile(!isFragile)}
                    className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 self-end ${
                      isFragile ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 sm:mt-0 ${
                        isFragile ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Prohibited Items Toggle */}
              <div className="p-3 sm:p-3.5 bg-white/15 rounded-xl border border-white/20">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="text-base shrink-0">🚫</span>
                    <div>
                      <Label className="text-sm sm:text-base font-semibold text-white cursor-pointer leading-snug">
                        {t('Contient produits interdits ?', 'Contains prohibited items?')}
                      </Label>
                      <p className="text-xs sm:text-sm text-white/90">{t('Inflammables, liquides, armes...', 'Flammables, liquids, weapons...')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hasProhibited}
                    onClick={() => setHasProhibited(!hasProhibited)}
                    className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 self-end ${
                      hasProhibited ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 sm:mt-0 ${
                        hasProhibited ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Prohibited warning */}
            {hasProhibited && (
              <div className="bg-red-600 border border-red-400 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-base mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm sm:text-base font-bold text-white">
                    {t('Produits interdits détectés !', 'Prohibited items detected!')}
                  </p>
                  <p className="text-xs sm:text-sm text-red-100 mt-0.5">
                    {t("Les produits inflammables, liquides >100ml et armes ne sont pas acceptés.", "Flammable products, liquids >100ml and weapons are not accepted.")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
