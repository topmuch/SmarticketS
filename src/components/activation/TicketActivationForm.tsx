'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Props {
  baggageId: string;
  agencyId: string;
  reference: string;
}

export default function TicketActivationForm({ baggageId, agencyId, reference }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  });

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

      const res = await fetch('/api/activate/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Échec activation');

      // Stocker dans sessionStorage pour le flow WhatsApp
      sessionStorage.setItem('ticket_activation', JSON.stringify({
        reference: data.reference,
        controlCode: data.controlCode,
        whatsappLink: data.whatsappLink,
        passengerPhone: data.passengerPhone,
        mode: 'ticket',
      }));

      // Rediriger vers page envoi WhatsApp
      router.push(`/sending?reference=${data.reference}&mode=ticket&waLink=${encodeURIComponent(data.whatsappLink)}`);
    } catch (err: any) {
      console.error('[TicketActivationForm] Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          {error}
        </div>
      )}

      {/* Section Passager */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-gray-800">👤 Informations Passager</h3>
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
            <p className="text-xs text-gray-400 mt-1">Format: 9 chiffres (ex: 771234567)</p>
          </div>
          <div>
            <label className={labelClass}>Pièce d&apos;identité *</label>
            <select
              className={inputClass}
              value={form.documentType}
              onChange={(e) => handleChange('documentType', e.target.value)}
            >
              <option value="CNI">CNI</option>
              <option value="PASSPORT">Passeport</option>
              <option value="BIRTH_CERTIFICATE">Extrait de naissance</option>
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
          <label className="flex items-center gap-3 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasParentalAuth}
              onChange={(e) => handleChange('hasParentalAuth', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-amber-800">
              ✅ Autorisation parentale signée (si accompagné d&apos;un tiers)
            </span>
          </label>
        )}
      </div>

      {/* Section Trajet */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-gray-800">🚌 Informations Trajet</h3>
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
              className={inputClass}
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
              className={inputClass}
              value={form.departureDate}
              onChange={(e) => handleChange('departureDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Heure de départ *</label>
            <input
              type="time"
              required
              className={inputClass}
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

      {/* Section Bagages */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-gray-800">🧳 Bagages</h3>
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
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              ✅ Franchise : 1 valise ≤15kg incluse
            </p>
            {luggageFee > 0 && (
              <p className="text-orange-600 font-bold text-lg">
                💰 +{luggageFee.toLocaleString('fr-FR')} FCFA
              </p>
            )}
          </div>
          {form.luggageWeightKg > 15 && (
            <div className="mt-2 text-xs text-gray-500">
              Excédent : {(form.luggageWeightKg - 15).toFixed(1)} kg × 200 FCFA/kg
            </div>
          )}
        </div>
      </div>

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Activation en cours...
          </>
        ) : (
          '✅ ACTIVER LE TICKET & ENVOYER WHATSAPP'
        )}
      </button>

      {/* Mentions légales */}
      <div className="text-center space-y-1">
        <p className="text-xs text-gray-400">
          En activant ce ticket, vous acceptez les conditions :
        </p>
        <p className="text-xs text-gray-400">
          Billet non remboursable · Report possible 1x (≥24h avant) · Pièce d&apos;identité obligatoire
        </p>
        <p className="text-xs text-gray-300 mt-2">
          Réf: {reference}
        </p>
      </div>
    </form>
  );
}
