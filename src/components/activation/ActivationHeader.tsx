'use client';

import { QrCode, Globe } from 'lucide-react';

interface ActivationHeaderProps {
  qrCode: string;
  onLangChange: (lang: 'fr' | 'en') => void;
  currentLang: 'fr' | 'en';
  /** Optional title override — defaults to 'Activation' */
  title?: string;
}

export default function ActivationHeader({ qrCode, onLangChange, currentLang, title }: ActivationHeaderProps) {
  const defaultTitle = currentLang === 'fr' ? 'Activation' : 'Activation';
  const displayTitle = title || defaultTitle;

  return (
    <header className="bg-[#8b5cf6] text-white sticky top-0 z-50 safe-area-inset-top">
      {/* Top row */}
      <div className="max-w-[600px] mx-auto px-3 sm:px-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#FF6B35] flex items-center justify-center">
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold tracking-tight block leading-tight text-white">SmarticketS</span>
            {qrCode && (
              <span className="text-[10px] sm:text-xs font-mono text-white/80 leading-tight">{qrCode}</span>
            )}
          </div>
        </div>

        {/* Lang */}
        <button
          onClick={() => onLangChange(currentLang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-white hover:text-white transition-colors px-2 sm:px-3 py-1.5 rounded-lg bg-white/10 shrink-0"
          aria-label="Switch language"
        >
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">{currentLang === 'fr' ? 'EN' : 'FR'}</span>
        </button>
      </div>

      {/* Title bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[600px] mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <h1 className="text-base sm:text-2xl font-extrabold text-white uppercase leading-tight">
            {displayTitle}
          </h1>
        </div>
      </div>
    </header>
  );
}
