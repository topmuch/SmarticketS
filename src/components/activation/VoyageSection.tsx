'use client';

import { Bus, Truck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface VoyageSectionProps {
  transportType: string;
  setTransportType: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  departureCity: string;
  setDepartureCity: (v: string) => void;
  arrivalCity: string;
  setArrivalCity: (v: string) => void;
  departureDate: string;
  setDepartureDate: (v: string) => void;
  departureTime: string;
  setDepartureTime: (v: string) => void;
  lang: 'fr' | 'en';
}

export default function VoyageSection({
  transportType, setTransportType,
  company, setCompany,
  departureCity, setDepartureCity,
  arrivalCity, setArrivalCity,
  departureDate, setDepartureDate,
  departureTime, setDepartureTime,
  lang,
}: VoyageSectionProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-[#FF6B35]">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        🚌 {t('LE VOYAGE', 'THE TRIP')}
      </h2>

      <div className="space-y-4">
        {/* Transport Type Toggle */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-[#4B5563]">
            {t('Type de Transport', 'Transport Type')} <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTransportType('GP')}
              aria-pressed={transportType === 'GP'}
              className={`flex items-center justify-center gap-2 h-12 rounded-lg border-2 text-sm font-semibold transition-all ${
                transportType === 'GP'
                  ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35] shadow-sm shadow-orange-200'
                  : 'border-[#E5E7EB] text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <Truck className="w-4 h-4" />
              GP 🚛
            </button>
            <button
              type="button"
              onClick={() => setTransportType('BUS')}
              aria-pressed={transportType === 'BUS'}
              className={`flex items-center justify-center gap-2 h-12 rounded-lg border-2 text-sm font-semibold transition-all ${
                transportType === 'BUS'
                  ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35] shadow-sm shadow-orange-200'
                  : 'border-[#E5E7EB] text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <Bus className="w-4 h-4" />
              BUS 🚌
            </button>
          </div>
        </div>

        {/* Company */}
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-sm font-medium text-[#4B5563]">
            {t('Compagnie de Transport', 'Transport Company')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="company_name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ex: Salam, Aline, Fatick Express..."
            className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm"
            aria-required="true"
          />
        </div>

        {/* Cities */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="departure_city" className="text-sm font-medium text-[#4B5563]">
              {t('Ville de Départ', 'Departure City')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="departure_city"
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value)}
              placeholder={t('Ex: Dakar', 'Ex: Dakar')}
              className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm"
              aria-required="true"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="arrival_city" className="text-sm font-medium text-[#4B5563]">
              {t("Ville d'Arrivée", 'Arrival City')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="arrival_city"
              value={arrivalCity}
              onChange={(e) => setArrivalCity(e.target.value)}
              placeholder={t('Ex: Ziguinchor', 'Ex: Ziguinchor')}
              className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm"
              aria-required="true"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="departure_date" className="text-sm font-medium text-[#4B5563]">
              {t('Date de Départ', 'Departure Date')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="departure_date"
              type="date"
              value={departureDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm [color-scheme:light]"
              aria-required="true"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="departure_time" className="text-sm font-medium text-[#4B5563]">
              {t('Heure de Départ', 'Departure Time')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="departure_time"
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="h-12 border-[#E5E7EB] focus-visible:ring-[#25D366] focus-visible:border-[#25D366] text-sm [color-scheme:light]"
              aria-required="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
