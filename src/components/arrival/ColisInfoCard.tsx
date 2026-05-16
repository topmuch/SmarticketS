'use client';

interface ColisInfoCardProps {
  reference: string;
  company: string;
  arrivalCity: string;
  departureDate: string | null;
  departureTime: string | null;
  transportType: string;
  lang: 'fr' | 'en';
}

export default function ColisInfoCard({
  reference, company, arrivalCity, departureDate, departureTime, transportType, lang,
}: ColisInfoCardProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const typeLabel = transportType === 'bus' ? '🚌 BUS' : '🚛 GP';

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-[#FF6B35]">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        📦 {t('Détails du Colis', 'Package Details')}
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('Référence', 'Reference')}</span>
          <span className="font-mono font-bold text-gray-900 text-sm">#{reference}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('Statut', 'Status')}</span>
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            🚚 {t('En Transit', 'In Transit')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('Transport', 'Transport')}</span>
          <span className="font-semibold text-gray-900 text-sm">{typeLabel} — {company}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('Trajet', 'Route')}</span>
          <span className="font-semibold text-gray-900 text-sm">{arrivalCity}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('Départ', 'Departure')}</span>
          <span className="font-medium text-gray-700 text-sm">
            {formatDate(departureDate)} {departureTime || ''}
          </span>
        </div>
      </div>
    </div>
  );
}
