'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Regex de validation stricte — alignée sur isValidReferenceFormat() de src/lib/qr.ts
 * Accepte : VOL26-VABJZS, HAJJ25-ZG46J2
 * Refuse : vol26-vabjzs (mais auto-uppercase le corrige), RANDOM, VOL26-ABC, etc.
 */
const REFERENCE_REGEX = /^(HAJJ|VOL)\d{2}-[A-Z0-9]{6}$/;

export default function TrackingWidget() {
  const router = useRouter();
  const { t, dir } = useTranslation();

  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  const inputId = 'tracking-reference-input';
  const errorId = 'tracking-reference-error';

  const handleSubmit = (): void => {
    const trimmed = inputValue.trim();

    // Empty check
    if (trimmed === '') {
      setError(t('home.tracking_empty'));
      return;
    }

    // Validation regex
    if (!REFERENCE_REGEX.test(trimmed)) {
      setError(t('home.tracking_error'));
      return;
    }

    // Navigate to tracking page
    router.push(`/suivi/${trimmed}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value.toUpperCase());
    // Clear error on typing
    if (error) setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      dir={dir}
      className="w-full max-w-lg mx-auto px-4"
    >
      <div className="relative bg-black/30 backdrop-blur-sm border border-[#D4AF37]/20 rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/20">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 text-white font-semibold text-base sm:text-lg mb-4"
        >
          <Search className="w-5 h-5 text-[#D4AF37]" />
          {t('home.tracking_label')}
        </label>

        {/* Input + Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('home.tracking_placeholder')}
            aria-label={t('home.tracking_label')}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error !== ''}
            autoComplete="off"
            spellCheck={false}
            maxLength={15}
            className={`
              flex-1 w-full sm:w-auto px-4 py-3.5 rounded-xl text-base font-mono tracking-wider
              bg-black/50 border text-white placeholder:text-white/30
              transition-all duration-200 outline-none
              focus:ring-2 focus:ring-[#D4AF37]/50
              ${error
                ? 'border-red-400/60 focus:border-red-400'
                : 'border-white/10 focus:border-[#D4AF37]/50'
              }
            `}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="
              flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
              bg-[#FF6B35] hover:bg-orange-600 active:bg-orange-700
              text-white font-semibold text-base
              shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              min-h-[48px]
            "
          >
            <Search className="w-4 h-4" />
            <span>{t('home.tracking_button')}</span>
          </button>
        </div>

        {/* Error message — rendu conditionnel uniquement si nécessaire */}
        {error !== '' && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-red-400 text-xs mt-2 flex items-center gap-1"
          >
            <span className="inline-block w-1 h-1 bg-red-400 rounded-full flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
