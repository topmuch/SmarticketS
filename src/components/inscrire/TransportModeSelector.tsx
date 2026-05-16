/**
 * TRANSPORT-FEATURE: Transport Mode Selector Component
 *
 * Sélecteur visuel de mode de transport : 4 boutons en grid 2×2.
 * Chaque bouton affiche l'icône emoji + label i18n + description.
 *
 * Usage:
 *   <TransportModeSelector
 *     selectedMode={transportMode}
 *     onSelect={setTransportMode}
 *     t={t}
 *   />
 */

'use client';

import type { TransportMode } from '@/lib/transport';
import { TRANSPORT_MODES, TRANSPORT_ICONS, TRANSPORT_LABELS, TRANSPORT_DESCRIPTIONS } from '@/lib/transport';
import type { Language } from '@/lib/i18n';

interface TransportModeSelectorProps {
  /** Mode actuellement sélectionné */
  selectedMode: TransportMode | '';
  /** Callback quand un mode est sélectionné */
  onSelect: (mode: TransportMode) => void;
  /** Fonction de traduction */
  t: (key: string) => string;
  /** Langue courante */
  lang: Language;
}

export default function TransportModeSelector({
  selectedMode,
  onSelect,
  t,
  lang,
}: TransportModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {TRANSPORT_MODES.map((mode) => {
        const isSelected = selectedMode === mode;
        const icon = TRANSPORT_ICONS[mode];
        const label = TRANSPORT_LABELS[mode][lang] ?? TRANSPORT_LABELS[mode].fr;
        const description = TRANSPORT_DESCRIPTIONS[mode][lang] ?? TRANSPORT_DESCRIPTIONS[mode].fr;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
            aria-pressed={isSelected}
            aria-label={t(`transport.mode_${mode}`)}
            className={`
              relative flex flex-col items-center justify-center
              rounded-xl p-4 sm:p-5 min-h-[80px] sm:min-h-[90px]
              border-2 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
              ${
                isSelected
                  ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20 scale-[1.02]'
                  : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/40'
              }
            `}
          >
            {/* Emoji icon */}
            <span className={`text-3xl sm:text-4xl mb-1.5 ${isSelected ? 'scale-110' : ''} transition-transform duration-200`}>
              {icon}
            </span>

            {/* Label */}
            <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-orange-400' : 'text-white'} transition-colors`}>
              {label}
            </span>

            {/* Description */}
            <span className="text-[10px] sm:text-xs text-white/60 mt-0.5 leading-tight text-center">
              {description}
            </span>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
