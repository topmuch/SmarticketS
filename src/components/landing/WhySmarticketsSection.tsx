'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import FadeIn from './FadeIn';

const checklistItems = [
  'Réduction de 70% des appels "Où est mon colis ?"',
  'Validation PIN = 0 litige sur la remise',
  'Détection IP = saisie téléphone simplifiée (+221 auto)',
  'Conformité RGPD & journal d\'audit complet',
];

const inlineStats = [
  { icon: '⏱️', label: '30s d\'activation' },
  { icon: '📉', label: '-40% de réclamations' },
  { icon: '🌍', label: '100% mobile' },
];

function DashboardIllustration() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-[#FF6B35]/10 to-[#10B981]/10 rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl p-6 lg:p-8 shadow-[0_8px_32px_rgba(10,37,64,0.1)] border border-[#E2E8F0]">
        <svg
          viewBox="0 0 480 360"
          className="w-full h-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dashboard frame */}
          <rect x="20" y="20" width="440" height="320" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
          {/* Top bar */}
          <rect x="20" y="20" width="440" height="48" rx="16" fill="#0A2540" />
          <rect x="20" y="52" width="440" height="16" fill="#0A2540" />
          <circle cx="44" cy="44" r="6" fill="#EF4444" />
          <circle cx="66" cy="44" r="6" fill="#F59E0B" />
          <circle cx="88" cy="44" r="6" fill="#10B981" />
          <text x="240" y="48" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">
            SmarticketS — Dashboard Agence
          </text>

          {/* Sidebar */}
          <rect x="20" y="68" width="90" height="272" fill="#0F172A" />
          <rect x="30" y="85" width="70" height="8" rx="4" fill="#1A3A52" />
          <rect x="30" y="100" width="55" height="8" rx="4" fill="#FF6B35" />
          <rect x="30" y="115" width="60" height="8" rx="4" fill="#1A3A52" />
          <rect x="30" y="130" width="50" height="8" rx="4" fill="#1A3A52" />
          <rect x="30" y="145" width="65" height="8" rx="4" fill="#1A3A52" />

          {/* Main content area */}
          {/* Stats cards row */}
          <rect x="125" y="80" width="100" height="56" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="140" y="102" fontSize="8" fill="#475569">Colis/jour</text>
          <text x="140" y="122" fontSize="18" fill="#0A2540" fontWeight="bold">847</text>

          <rect x="240" y="80" width="100" height="56" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="255" y="102" fontSize="8" fill="#475569">En transit</text>
          <text x="255" y="122" fontSize="18" fill="#FF6B35" fontWeight="bold">124</text>

          <rect x="355" y="80" width="90" height="56" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="368" y="102" fontSize="8" fill="#475569">Taux livrés</text>
          <text x="368" y="122" fontSize="18" fill="#10B981" fontWeight="bold">98%</text>

          {/* Chart area */}
          <rect x="125" y="150" width="210" height="130" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="140" y="170" fontSize="9" fill="#0A2540" fontWeight="bold">Volume hebdomadaire</text>
          {/* Bar chart */}
          <rect x="145" y="250" width="20" height="18" rx="3" fill="#FF6B35" opacity="0.5" />
          <rect x="175" y="240" width="20" height="28" rx="3" fill="#FF6B35" opacity="0.65" />
          <rect x="205" y="230" width="20" height="38" rx="3" fill="#FF6B35" opacity="0.8" />
          <rect x="235" y="220" width="20" height="48" rx="3" fill="#FF6B35" opacity="0.9" />
          <rect x="265" y="210" width="20" height="58" rx="3" fill="#FF6B35" />
          <rect x="295" y="225" width="20" height="43" rx="3" fill="#10B981" opacity="0.7" />
          <text x="148" y="268" fontSize="6" fill="#475569">L</text>
          <text x="178" y="268" fontSize="6" fill="#475569">M</text>
          <text x="208" y="268" fontSize="6" fill="#475569">M</text>
          <text x="238" y="268" fontSize="6" fill="#475569">J</text>
          <text x="268" y="268" fontSize="6" fill="#475569">V</text>
          <text x="298" y="268" fontSize="6" fill="#475569">S</text>

          {/* Map area */}
          <rect x="350" y="150" width="95" height="130" rx="10" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
          <text x="397" y="200" textAnchor="middle" fontSize="8" fill="#10B981" fontWeight="bold">
            📍 Suivi GPS
          </text>
          <text x="397" y="215" textAnchor="middle" fontSize="7" fill="#475569">
            Temps réel
          </text>
          {/* Map dots */}
          <circle cx="370" cy="245" r="4" fill="#FF6B35" />
          <circle cx="397" cy="230" r="4" fill="#10B981" />
          <circle cx="420" cy="250" r="4" fill="#FF6B35" />
          <circle cx="385" cy="260" r="4" fill="#10B981" />
          {/* Connecting lines */}
          <line x1="370" y1="245" x2="397" y2="230" stroke="#FF6B35" strokeWidth="1" opacity="0.3" />
          <line x1="397" y1="230" x2="420" y2="250" stroke="#10B981" strokeWidth="1" opacity="0.3" />

          {/* Recent activity */}
          <rect x="125" y="293" width="320" height="38" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          <text x="140" y="312" fontSize="8" fill="#475569">Dernière livraison</text>
          <text x="140" y="324" fontSize="9" fill="#10B981" fontWeight="bold">✅ DKR-2026-0089 → Livré à 14:32</text>
          <text x="350" y="316" fontSize="7" fill="#FF6B35" fontWeight="bold">● Live</text>
        </svg>
      </div>
    </div>
  );
}

export default function WhySmarticketSSection() {
  return (
    <section
      id="advantages"
      className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
      style={{ background: '#F8FAFC' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Dashboard illustration */}
          <FadeIn direction="right">
            <DashboardIllustration />
          </FadeIn>

          {/* Right — Text content */}
          <FadeIn direction="left" delay={0.15}>
            <div>
              {/* Badge */}
              <span className="inline-block px-4 py-1.5 bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-bold tracking-[0.15em] uppercase rounded-full mb-6">
                AVANTAGES OPÉRATIONNELS
              </span>

              {/* H2 */}
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0A2540] mb-6 tracking-tight leading-tight">
                La technologie au service de la confiance logistique
              </h2>

              {/* Checklist */}
              <div className="space-y-4 mb-8">
                {checklistItems.map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                    <span className="text-[#0A2540] font-medium text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Inline stats */}
              <div className="flex flex-wrap gap-4 mb-8">
                {inlineStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg border border-[#E2E8F0] shadow-sm"
                  >
                    <span className="text-lg">{stat.icon}</span>
                    <span className="text-sm font-semibold text-[#0A2540]">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href="/devenir-partenaire">
                <Button className="bg-[#FF6B35] hover:bg-[#e65a28] text-white px-7 py-3.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)] transition-all hover:scale-[1.02] gap-2">
                  📞 Demander une démo agence
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
