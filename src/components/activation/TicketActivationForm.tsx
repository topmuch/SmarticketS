'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, MapPin, Users, CheckCircle } from 'lucide-react';

interface Props {
  baggageId: string;
  agencyId: string;
  reference: string;
}

interface AvailableDeparture {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  availableSeats: number;
  departureType: string;
  routeName?: string;
  originStationName?: string;
}

export default function TicketActivationForm({ baggageId, agencyId, reference }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departures, setDepartures] = useState<AvailableDeparture[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(true);
  const [hasDepartures, setHasDepartures] = useState(false);

  const [form, setForm] = useState({
    passengerName: '',
    passengerPhone: '',
    passengerAge: '',
    documentType: 'CNI',
    documentNumber: '',
    hasParentalAuth: false,
    destination: '',
    departureStation: '',
    seatNumber: '',
    busCompany: '',
    luggageCount: 1,
    luggageWeightKg: 0,
    departureDate: '',
    departureTime: '',
    departureId: '',
  });

  // Charger les départs disponibles pour l'agence
  useEffect(() => {
    if (!agencyId) {
      setDeparturesLoading(false);
      return;
    }

    async function loadDepartures() {
      try {
        const res = await fetch(`/api/departures/available?agencyId=${agencyId}`);
        if (res.ok) {
          const data = await res.json();
          const deps = data.departures || [];
          setDepartures(deps);
          setHasDepartures(deps.length > 0);
        }
      } catch (err) {
        console.error('Erreur chargement départs:', err);
      } finally {
        setDeparturesLoading(false);
      }
    }
    loadDepartures();
  }, [agencyId]);

  // Quand un départ est sélectionné, auto-remplir les champs trajet
  const handleDepartureSelect = (departureId: string) => {
    if (!departureId) {
      setForm(prev => ({
        ...prev,
        departureId: '',
        destination: '',
        departureTime: '',
        departureStation: '',
        departureDate: '',
        busCompany: '',
      }));
      return;
    }

    const dep = departures.find(d => d.id === departureId);
    if (dep) {
      const time = new Date(dep.scheduledTime);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const dateStr = time.getFullYear() + '-' +
        String(time.getMonth() + 1).padStart(2, '0') + '-' +
        String(time.getDate()).padStart(2, '0');

      setForm(prev => ({
        ...prev,
        departureId: dep.id,
        destination: dep.destination,
        departureTime: `${hours}:${minutes}`,
        departureDate: dateStr,
        departureStation: dep.originStationName || prev.departureStation,
        busCompany: dep.routeName || prev.busCompany,
      }));
    }
  };

  const passengerAge = parseInt(form.passengerAge) || 0;

  // Calcul frais bagages en temps réel
  const luggageFee = Math.max(0, (form.luggageWeightKg || 0) - 15) * 200;

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        baggageId,
        agencyId,
        ...form,
        passengerAge: form.passengerAge,
        luggageCount: parseInt(String(form.luggageCount)),
        luggageWeightKg: parseFloat(String(form.luggageWeightKg)),
        luggageFee,
      };

      // Si pas de départ sélectionné, ne pas envoyer departureId
      if (!submitData.departureId) {
        (submitData as Record<string, unknown>).departureId = undefined;
      }

      const res = await fetch('/api/activate/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Échec activation');

      // Rediriger vers la page de visualisation du ticket
      router.push(`/retrieve/${data.reference}`);
    } catch (err: any) {
      console.error('[TicketActivationForm] Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Styles bleu pointillé blanc ──
  const cardClass = "p-5 bg-[#215ae2] rounded-xl border-2 border-dashed border-white/50 shadow-sm";
  const inputClass = "w-full p-3 border border-dashed border-white/40 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:border-white/60 transition text-sm";
  const labelClass = "block text-sm font-medium text-white mb-1";
  const selectedDep = departures.find(d => d.id === form.departureId);
  const isAutoFilled = !!form.departureId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border-2 border-dashed border-red-300/50 text-red-200 rounded-lg text-sm flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          {error}
        </div>
      )}

      {/* ── SECTION DÉPART INTELLIGENTE ── */}
      {hasDepartures && (
        <div className={cardClass}>
          <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            🚌 Sélection du Départ
          </h3>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Départ du jour</label>
              <select
                className={inputClass}
                value={form.departureId}
                onChange={(e) => handleDepartureSelect(e.target.value)}
              >
                <option value="">-- Saisie manuelle --</option>
                {departures.map(dep => {
                  const time = new Date(dep.scheduledTime);
                  const hours = time.getHours().toString().padStart(2, '0');
                  const minutes = time.getMinutes().toString().padStart(2, '0');
                  return (
                    <option key={dep.id} value={dep.id} className="text-gray-900">
                      {hours}:{minutes} — {dep.lineNumber} → {dep.destination} ({dep.availableSeats} places)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Carte résumé du départ sélectionné */}
            {selectedDep && (
              <div className="p-4 bg-white/10 rounded-lg border border-dashed border-white/40">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span className="font-bold text-white text-sm">Départ sélectionné</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">🕐</span>
                    <span className="font-medium">
                      {new Date(selectedDep.scheduledTime).getHours().toString().padStart(2, '0')}:
                      {new Date(selectedDep.scheduledTime).getMinutes().toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">{selectedDep.destination}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{selectedDep.availableSeats} places disponibles</span>
                  </div>
                  {selectedDep.platform && (
                    <div className="flex items-center gap-2">
                      <span>🏷️</span>
                      <span>Quai {selectedDep.platform}</span>
                    </div>
                  )}
                  {selectedDep.originStationName && (
                    <div className="flex items-center gap-2 col-span-2">
                      <span>📍</span>
                      <span>Départ : {selectedDep.originStationName}</span>
                    </div>
                  )}
                  {selectedDep.routeName && (
                    <div className="flex items-center gap-2 col-span-2">
                      <span>🛤️</span>
                      <span className="text-xs text-white/70">{selectedDep.routeName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION PASSAGER ── */}
      <div className={cardClass}>
        <h3 className="font-bold text-lg mb-4 text-white">👤 Informations Passager</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nom complet *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Ex: Mamadou Diallo"
              value={form.passengerName}
              onChange={(e) => handleChange('passengerName', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Âge *</label>
            <input
              type="number"
              min="0"
              max="120"
              required
              className={inputClass}
              placeholder="Ex: 28"
              value={form.passengerAge}
              onChange={(e) => handleChange('passengerAge', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input
              type="tel"
              placeholder="771234567"
              pattern="[0-9]{9}"
              required
              className={inputClass}
              value={form.passengerPhone}
              onChange={(e) => handleChange('passengerPhone', e.target.value)}
            />
            <p className="text-xs text-white/50 mt-1">Format: 9 chiffres (ex: 771234567)</p>
          </div>
          <div>
            <label className={labelClass}>Pièce d&apos;identité *</label>
            <select
              className={inputClass}
              value={form.documentType}
              onChange={(e) => handleChange('documentType', e.target.value)}
            >
              <option value="CNI" className="text-gray-900">CNI</option>
              <option value="PASSPORT" className="text-gray-900">Passeport</option>
              <option value="BIRTH_CERTIFICATE" className="text-gray-900">Extrait de naissance</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>N° pièce *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Numéro de la pièce d'identité"
              value={form.documentNumber}
              onChange={(e) => handleChange('documentNumber', e.target.value)}
            />
          </div>
        </div>

        {passengerAge > 0 && passengerAge < 18 && (
          <label className="flex items-center gap-3 mt-4 p-3 bg-white/10 border border-dashed border-white/30 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasParentalAuth}
              onChange={(e) => handleChange('hasParentalAuth', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-white">
              ✅ Autorisation parentale signée (si accompagné d&apos;un tiers)
            </span>
          </label>
        )}
      </div>

      {/* ── SECTION TRAJET ── */}
      <div className={cardClass}>
        <h3 className="font-bold text-lg mb-4 text-white">
          🚌 Informations Trajet
          {isAutoFilled && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
              <CheckCircle className="w-3 h-3" /> Auto-rempli
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Lieu de départ *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Ex: Gare Peters, Dakar"
              value={form.departureStation}
              onChange={(e) => handleChange('departureStation', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Destination *</label>
            <input
              type="text"
              required
              className={isAutoFilled ? 'w-full p-3 border border-dashed border-white/40 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-white/50' : inputClass}
              placeholder="Ex: Saint-Louis"
              value={form.destination}
              onChange={(e) => handleChange('destination', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Compagnie de transport *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Ex: DTW, SOTRAMAC"
              value={form.busCompany}
              onChange={(e) => handleChange('busCompany', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Date de départ *</label>
            <input
              type="date"
              required
              className={isAutoFilled ? 'w-full p-3 border border-dashed border-white/40 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-white/50' : inputClass}
              value={form.departureDate}
              onChange={(e) => handleChange('departureDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Heure de départ *</label>
            <input
              type="time"
              required
              className={isAutoFilled ? 'w-full p-3 border border-dashed border-white/40 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-white/50' : inputClass}
              value={form.departureTime}
              onChange={(e) => handleChange('departureTime', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>N° Siège *</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder="Ex: 12A"
              value={form.seatNumber}
              onChange={(e) => handleChange('seatNumber', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION BAGAGES ── */}
      <div className={cardClass}>
        <h3 className="font-bold text-lg mb-4 text-white">🧳 Bagages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre de valises</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={form.luggageCount}
              onChange={(e) => handleChange('luggageCount', parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className={labelClass}>Poids total (kg)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className={inputClass}
              placeholder="0"
              value={form.luggageWeightKg}
              onChange={(e) => handleChange('luggageWeightKg', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Calcul frais en temps réel */}
        <div className="mt-4 p-4 bg-white/10 rounded-lg border border-dashed border-white/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80">
              ✅ Franchise : 1 valise ≤15kg incluse
            </p>
            {luggageFee > 0 && (
              <p className="text-yellow-300 font-bold text-lg">
                💰 +{luggageFee.toLocaleString('fr-FR')} FCFA
              </p>
            )}
          </div>
          {form.luggageWeightKg > 15 && (
            <div className="mt-2 text-xs text-white/50">
              Excédent : {(form.luggageWeightKg - 15).toFixed(1)} kg × 200 FCFA/kg
            </div>
          )}
        </div>
      </div>

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-6 rounded-xl border-2 border-dashed border-white/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Activation en cours...
          </>
        ) : (
          '✅ ACTIVER LE TICKET'
        )}
      </button>

      {/* Mentions légales */}
      <div className="text-center space-y-1">
        <p className="text-xs text-white/50">
          En activant ce ticket, vous acceptez les conditions :
        </p>
        <p className="text-xs text-white/50">
          Billet non remboursable · Report possible 1x (≥24h avant) · Pièce d&apos;identité obligatoire
        </p>
        <p className="text-xs text-white/30 mt-2">
          Réf: {reference}
        </p>
      </div>
    </form>
  );
}
