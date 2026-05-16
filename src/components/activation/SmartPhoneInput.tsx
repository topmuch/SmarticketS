'use client';

import { useEffect, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ─── Country Calling Codes ───────────────────────────────
const COUNTRY_CALLING_CODES: Record<string, { code: string; flag: string }> = {
  SN: { code: '+221', flag: '🇸🇳' },
  CI: { code: '+225', flag: '🇨🇮' },
  ML: { code: '+223', flag: '🇲🇱' },
  GN: { code: '+224', flag: '🇬🇳' },
  BF: { code: '+226', flag: '🇧🇫' },
  MR: { code: '+222', flag: '🇲🇷' },
  TG: { code: '+228', flag: '🇹🇬' },
  BJ: { code: '+229', flag: '🇧🇯' },
  NE: { code: '+227', flag: '🇳🇪' },
  TD: { code: '+235', flag: '🇹🇩' },
  CM: { code: '+237', flag: '🇨🇲' },
  GA: { code: '+241', flag: '🇬🇦' },
  CG: { code: '+242', flag: '🇨🇬' },
  CD: { code: '+243', flag: '🇨🇩' },
  GQ: { code: '+240', flag: '🇬🇶' },
  CF: { code: '+236', flag: '🇨🇫' },
  GW: { code: '+245', flag: '🇬🇼' },
  SL: { code: '+232', flag: '🇸🇱' },
  LR: { code: '+231', flag: '🇱🇷' },
  FR: { code: '+33', flag: '🇫🇷' },
  BE: { code: '+32', flag: '🇧🇪' },
  CH: { code: '+41', flag: '🇨🇭' },
  ES: { code: '+34', flag: '🇪🇸' },
  IT: { code: '+39', flag: '🇮🇹' },
  US: { code: '+1', flag: '🇺🇸' },
  MA: { code: '+212', flag: '🇲🇦' },
  DZ: { code: '+213', flag: '🇩🇿' },
  TN: { code: '+216', flag: '🇹🇳' },
  LY: { code: '+218', flag: '🇱🇾' },
  EG: { code: '+20', flag: '🇪🇬' },
  GM: { code: '+220', flag: '🇬🇲' },
  CV: { code: '+238', flag: '🇨🇻' },
  ST: { code: '+239', flag: '🇸🇹' },
  KM: { code: '+269', flag: '🇰🇲' },
  SD: { code: '+249', flag: '🇸🇩' },
  ER: { code: '+291', flag: '🇪🇷' },
  DJ: { code: '+253', flag: '🇩🇯' },
  SO: { code: '+252', flag: '🇸🇴' },
  MG: { code: '+261', flag: '🇲🇬' },
  KE: { code: '+254', flag: '🇰🇪' },
  UG: { code: '+256', flag: '🇺🇬' },
  RW: { code: '+250', flag: '🇷🇼' },
  BI: { code: '+257', flag: '🇧🇮' },
  ET: { code: '+251', flag: '🇪🇹' },
  TZ: { code: '+255', flag: '🇹🇿' },
  AO: { code: '+244', flag: '🇦🇴' },
  MZ: { code: '+258', flag: '🇲🇿' },
  ZM: { code: '+260', flag: '🇿🇲' },
  ZW: { code: '+263', flag: '🇿🇼' },
  MW: { code: '+265', flag: '🇲🇼' },
  SA: { code: '+966', flag: '🇸🇦' },
  AE: { code: '+971', flag: '🇦🇪' },
  QA: { code: '+974', flag: '🇶🇦' },
  KW: { code: '+965', flag: '🇰🇼' },
  BH: { code: '+973', flag: '🇧🇭' },
  OM: { code: '+968', flag: '🇴🇲' },
  JO: { code: '+962', flag: '🇯🇴' },
  LB: { code: '+961', flag: '🇱🇧' },
  IQ: { code: '+964', flag: '🇮🇶' },
  PS: { code: '+970', flag: '🇵🇸' },
  IL: { code: '+972', flag: '🇮🇱' },
  YE: { code: '+967', flag: '🇾🇪' },
  SY: { code: '+963', flag: '🇸🇾' },
  GB: { code: '+44', flag: '🇬🇧' },
  DE: { code: '+49', flag: '🇩🇪' },
  NL: { code: '+31', flag: '🇳🇱' },
  PT: { code: '+351', flag: '🇵🇹' },
  SE: { code: '+46', flag: '🇸🇪' },
  DK: { code: '+45', flag: '🇩🇰' },
  NO: { code: '+47', flag: '🇳🇴' },
  FI: { code: '+358', flag: '🇫🇮' },
  PL: { code: '+48', flag: '🇵🇱' },
  CZ: { code: '+420', flag: '🇨🇿' },
  AT: { code: '+43', flag: '🇦🇹' },
  HU: { code: '+36', flag: '🇭🇺' },
  RO: { code: '+40', flag: '🇷🇴' },
  GR: { code: '+30', flag: '🇬🇷' },
  RU: { code: '+7', flag: '🇷🇺' },
  TR: { code: '+90', flag: '🇹🇷' },
  CN: { code: '+86', flag: '🇨🇳' },
  IN: { code: '+91', flag: '🇮🇳' },
  PK: { code: '+92', flag: '🇵🇰' },
  BD: { code: '+880', flag: '🇧🇩' },
  JP: { code: '+81', flag: '🇯🇵' },
  KR: { code: '+82', flag: '🇰🇷' },
  BR: { code: '+55', flag: '🇧🇷' },
  MX: { code: '+52', flag: '🇲🇽' },
  AR: { code: '+54', flag: '🇦🇷' },
  CA: { code: '+1', flag: '🇨🇦' },
  AU: { code: '+61', flag: '🇦🇺' },
};

// Fallback: Senegal
const FALLBACK_COUNTRY = 'SN';

// ─── Interface ───────────────────────────────────────────
interface SmartPhoneInputProps {
  label: string;
  value: string; // full E.164 number
  onChange: (fullPhone: string) => void;
  hint?: string;
  error?: string | null;
  name: string;
}

// ─── Helpers ─────────────────────────────────────────────

/**
 * Format a local number string with spaces every 2 digits for readability.
 * Example: "771234567" → "77 12 34 56 7"
 */
function formatLocalDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return digits.match(/.{1,2}/g)?.join(' ') || digits;
}

/**
 * Extract local digits from a full E.164 number, given a known calling code.
 */
function extractLocalDigits(e164: string, callingCode: string): string {
  const cleaned = e164.replace(/\D/g, '');
  const codeDigits = callingCode.replace(/\D/g, '');
  if (cleaned.startsWith(codeDigits)) {
    return cleaned.slice(codeDigits.length);
  }
  return cleaned;
}

// ─── Component ───────────────────────────────────────────

export default function SmartPhoneInput({
  label,
  value,
  onChange,
  hint,
  error,
  name,
}: SmartPhoneInputProps) {
  const [countryCode, setCountryCode] = useState<string>(FALLBACK_COUNTRY);
  const [localInput, setLocalInput] = useState<string>('');
  const [detected, setDetected] = useState(false);

  const callingCode = COUNTRY_CALLING_CODES[countryCode]?.code || '+221';
  const flag = COUNTRY_CALLING_CODES[countryCode]?.flag || '🇸🇳';

  // ─── Auto-detect country on mount ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function detectCountry() {
      try {
        const res = await fetch('/api/detect-country');
        if (!res.ok) throw new Error('detect-country API failed');
        const data = await res.json();
        const cc = (data.countryCode || '').toUpperCase();
        if (!cancelled && cc && COUNTRY_CALLING_CODES[cc]) {
          setCountryCode(cc);
          setDetected(true);
        }
      } catch {
        // Fallback to SN (Senegal) — already the default
        if (!cancelled) setDetected(false);
      }
    }

    detectCountry();
    return () => { cancelled = true; };
  }, []);

  // ─── Sync external value (E.164) into local state when country changes ─
  useEffect(() => {
    if (!value) {
      setLocalInput('');
      return;
    }
    const digits = extractLocalDigits(value, callingCode);
    setLocalInput(digits);
  }, [callingCode, value]);

  // ─── Handle local input change ─────────────────────────
  const handleLocalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip everything except digits
      const digitsOnly = e.target.value.replace(/\D/g, '');
      setLocalInput(digitsOnly);
      // Emit full E.164
      const full = digitsOnly ? `${callingCode}${digitsOnly}` : '';
      onChange(full);
    },
    [callingCode, onChange],
  );

  const formattedDisplay = formatLocalDisplay(localInput);

  const inputId = name;
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium text-[#4B5563]">
        {label} <span className="text-red-500">*</span>
      </Label>

      {/* Phone input with badge */}
      <div
        className={`flex items-center h-12 rounded-md border overflow-hidden transition-[color,box-shadow] ${
          error
            ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-400/30'
            : 'border-[#E5E7EB] focus-within:border-[#25D366] focus-within:ring-2 focus-within:ring-[#25D366]/20'
        }`}
      >
        {/* Country badge — fixed on the left */}
        <div className="flex items-center gap-1.5 pl-3 pr-2 bg-gray-50 border-r border-[#E5E7EB] h-full shrink-0 select-none">
          <span className="text-base leading-none">{flag}</span>
          <span className="text-sm font-mono font-medium text-gray-600">{callingCode}</span>
        </div>

        {/* Local number input */}
        <Input
          id={inputId}
          name={inputId}
          type="tel"
          inputMode="numeric"
          value={formattedDisplay}
          onChange={handleLocalChange}
          placeholder="77 12 34 56 67"
          className="h-full border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:border-0 text-sm font-mono px-3 bg-transparent"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
        />
      </div>

      {/* Error or hint message */}
      {error ? (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : (
        <div className="space-y-0.5">
          {hint && (
            <p id={hintId} className="text-xs text-gray-400">
              {hint}
            </p>
          )}
          {detected ? (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              ✅ Indicatif détecté automatiquement
            </p>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              🌐 Indicatif par défaut ({flag} {callingCode})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
