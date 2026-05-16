'use client';

import { QrCode, Truck, Globe } from 'lucide-react';

interface ActivationHeaderProps {
  qrCode: string;
  onLangChange: (lang: 'fr' | 'en') => void;
  currentLang: 'fr' | 'en';
}

export default function ActivationHeader({ qrCode, onLangChange, currentLang }: ActivationHeaderProps) {
  return (
    <header className="bg-black text-white sticky top-0 z-50">
      <div className="max-w-[600px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#FF6B35] flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-tight">QRTrans</span>
            {qrCode && (
              <span className="text-[10px] font-mono text-white/40 leading-tight">{qrCode}</span>
            )}
          </div>
        </div>

        {/* Badge Chauffeur */}
        <div className="flex items-center gap-1.5 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-3 py-1.5">
          <Truck className="w-3.5 h-3.5 text-[#FF6B35]" />
          <span className="text-xs font-semibold text-[#FF6B35]">
            {currentLang === 'fr' ? 'Mode Chauffeur' : 'Driver Mode'}
          </span>
        </div>

        {/* Lang */}
        <button
          onClick={() => onLangChange(currentLang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors px-2 py-1 rounded-md"
          aria-label="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          {currentLang === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>

      {/* Title bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[600px] mx-auto px-4 py-3">
          <h1 className="text-sm font-semibold text-white/80">
            📦 {currentLang === 'fr' ? "Inscription d'un Colis" : 'Package Registration'}
          </h1>
        </div>
      </div>
    </header>
  );
}
