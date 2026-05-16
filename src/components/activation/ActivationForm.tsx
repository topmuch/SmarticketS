'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import VoyageSection from './VoyageSection';
import SenderSection from './SenderSection';
import ReceiverSection from './ReceiverSection';
import SuccessScreen from './SuccessScreen';

const WHATSAPP_REGEX = /^\+[1-9]\d{1,14}$/;

interface ActivationFormProps {
  qrCode: string;
  lang: 'fr' | 'en';
}

export default function ActivationForm({ qrCode, lang }: ActivationFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Voyage (Card 1)
  const [transportType, setTransportType] = useState('');
  const [company, setCompany] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Driver (Card 1 - optional)
  const [driverPhone, setDriverPhone] = useState('');
  const [shareDriverPhone, setShareDriverPhone] = useState(false);

  // Sender (Card 2)
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  // Baggage (Card 2)
  const [baggageType, setBaggageType] = useState('');
  const [baggageTypeOther, setBaggageTypeOther] = useState('');
  const [baggageWeight, setBaggageWeight] = useState('');
  const [baggageDimensions, setBaggageDimensions] = useState('');
  const [baggageColor, setBaggageColor] = useState('');
  const [contentCategory, setContentCategory] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [hasProhibited, setHasProhibited] = useState(false);

  // Receiver (Card 3)
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // wa.me links from API response
  const [waSenderUrl, setWaSenderUrl] = useState('');
  const [waReceiverUrl, setWaReceiverUrl] = useState('');

  // Validation errors
  const [senderPhoneError, setSenderPhoneError] = useState<string | null>(null);
  const [receiverPhoneError, setReceiverPhoneError] = useState<string | null>(null);
  const [driverPhoneError, setDriverPhoneError] = useState<string | null>(null);

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const validatePhone = (value: string): string | null => {
    const cleaned = value.replace(/\s/g, '');
    if (!cleaned) return t('Numéro requis', 'Number required');
    if (!WHATSAPP_REGEX.test(cleaned)) return t('Format invalide. Ex: +221771234567', 'Invalid format. Ex: +221771234567');
    return null;
  };

  const validateAll = (): string | null => {
    // Card 1: Itinerary
    if (!transportType) return t('Sélectionnez le type de transport.', 'Select the transport type.');
    if (!company.trim()) return t('Saisissez la compagnie.', 'Enter the transport company.');
    if (!departureCity.trim()) return t('Saisissez la ville de départ.', 'Enter the departure city.');
    if (!arrivalCity.trim()) return t("Saisissez la ville d'arrivée.", 'Enter the arrival city.');
    if (!departureDate) return t('Saisissez la date de départ.', 'Enter the departure date.');
    if (!departureTime) return t("Saisissez l'heure de départ.", 'Enter the departure time.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(departureDate) < today) {
      return t('La date ne peut pas être dans le passé.', 'Date cannot be in the past.');
    }

    if (!paymentStatus) return t('Sélectionnez le statut de paiement.', 'Select the payment status.');

    // Card 2: Sender & Baggage
    if (!senderName.trim()) return t("Saisissez le nom de l'expéditeur.", "Enter the sender's name.");
    const sErr = validatePhone(senderPhone);
    if (sErr) { setSenderPhoneError(sErr); return sErr; }

    if (!baggageType) return t('Sélectionnez le type de bagage.', 'Select the baggage type.');
    if (baggageType === 'OTHER' && !baggageTypeOther.trim()) return t('Précisez le type de bagage.', 'Specify the baggage type.');

    // Prohibited items block
    if (hasProhibited) return t("Les produits interdits (inflammables, liquides >100ml, armes) ne sont pas acceptés. Veuillez modifier.", 'Prohibited items (flammables, liquids >100ml, weapons) are not accepted. Please modify.');

    // Card 1: Driver phone (optional, but if filled → must be valid)
    if (driverPhone) {
      const cleaned = driverPhone.replace(/\s/g, '');
      if (!WHATSAPP_REGEX.test(cleaned)) {
        const dErr = t('Format invalide. Ex: +221771234567', 'Invalid format. Ex: +221771234567');
        setDriverPhoneError(dErr);
        return dErr;
      }
      // If share toggled but no phone → warn
      if (shareDriverPhone && cleaned.length < 8) {
        const dErr = t('Numéro incomplet pour le partage.', 'Incomplete number for sharing.');
        setDriverPhoneError(dErr);
        return dErr;
      }
    } else if (shareDriverPhone) {
      const dErr = t('Entrez un numéro pour activer le partage.', 'Enter a number to enable sharing.');
      setDriverPhoneError(dErr);
      return dErr;
    }

    // Card 3: Receiver
    if (!receiverName.trim()) return t('Saisissez le nom du destinataire.', "Enter the receiver's name.");
    const rErr = validatePhone(receiverPhone);
    if (rErr) { setReceiverPhoneError(rErr); return rErr; }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenderPhoneError(null);
    setReceiverPhoneError(null);
    setDriverPhoneError(null);

    const err = validateAll();
    if (err) {
      setErrorCode('validation');
      setErrorMessage(err);
      return;
    }

    setErrorCode(null);
    setErrorMessage('');
    setLoading(true);

    try {
      // Build departure_datetime: "2026-05-15T08:00:00Z"
      const departureDatetime = `${departureDate}T${departureTime}:00Z`;

      const payload = {
        transport_type: transportType as 'GP' | 'BUS',
        company_name: company.trim(),
        departure_city: departureCity.trim(),
        arrival_city: arrivalCity.trim(),
        departure_datetime: departureDatetime,
        pickup_address: pickupAddress.trim() || undefined,
        estimated_arrival: estimatedArrival || undefined,
        payment_status: paymentStatus as 'SENDER_PAID' | 'RECEIVER_PAY',
        driver_phone: driverPhone.replace(/\s/g, '') || undefined,
        share_driver_phone: shareDriverPhone,
        sender: {
          name: senderName.trim(),
          phone: senderPhone.replace(/\s/g, ''),
        },
        receiver: {
          name: receiverName.trim(),
          phone: receiverPhone.replace(/\s/g, ''),
        },
        baggage: {
          type: baggageType,
          typeOther: baggageType === 'OTHER' ? baggageTypeOther.trim() : undefined,
          weight: baggageWeight ? parseFloat(baggageWeight) : undefined,
          dimensions: baggageDimensions.trim() || undefined,
          color: baggageColor.trim() || undefined,
          contentCategory: contentCategory || undefined,
          declaredValue: declaredValue ? parseFloat(declaredValue) : undefined,
          isFragile,
          hasProhibited,
        },
      };

      const res = await fetch(`/api/activate/${encodeURIComponent(qrCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setWaSenderUrl(data.wa_sender || '');
        setWaReceiverUrl(data.wa_receiver || '');
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (['already_in_transit', 'already_delivered', 'already_active'].includes(data.error)) {
        setErrorCode(data.error);
        setErrorMessage(data.message);
      } else if (data.error === 'not_found') {
        setErrorCode('not_found');
        setErrorMessage(data.message);
      } else if (data.error === 'blocked') {
        setErrorCode('blocked');
        setErrorMessage(data.message);
      } else if (data.error === 'invalid_date') {
        setErrorCode('validation');
        setErrorMessage(data.message);
      } else {
        setErrorCode('server_error');
        setErrorMessage(data.message || t("Échec. Vérifiez votre connexion et réessayez.", 'Failed. Check your connection and retry.'));
      }
    } catch {
      setErrorCode('network');
      setErrorMessage(t("Échec de l'activation. Vérifiez votre connexion et réessayez.", 'Activation failed. Check your connection and retry.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setErrorCode(null);
    setErrorMessage('');
    setTransportType('');
    setCompany('');
    setDepartureCity('');
    setArrivalCity('');
    setDepartureDate('');
    setDepartureTime('');
    setPickupAddress('');
    setEstimatedArrival('');
    setPaymentStatus('');
    setDriverPhone('');
    setShareDriverPhone(false);
    setSenderName('');
    setSenderPhone('');
    setBaggageType('');
    setBaggageTypeOther('');
    setBaggageWeight('');
    setBaggageDimensions('');
    setBaggageColor('');
    setContentCategory('');
    setDeclaredValue('');
    setIsFragile(false);
    setHasProhibited(false);
    setReceiverName('');
    setReceiverPhone('');
    setWaSenderUrl('');
    setWaReceiverUrl('');
    setSenderPhoneError(null);
    setReceiverPhoneError(null);
    setDriverPhoneError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Success state
  if (success) {
    return (
      <SuccessScreen
        reference={qrCode}
        transportType={transportType}
        company={company}
        departureCity={departureCity}
        arrivalCity={arrivalCity}
        departureDate={departureDate}
        departureTime={departureTime}
        senderName={senderName}
        senderPhone={senderPhone.replace(/\s/g, '')}
        receiverName={receiverName}
        receiverPhone={receiverPhone.replace(/\s/g, '')}
        waSenderUrl={waSenderUrl}
        waReceiverUrl={waReceiverUrl}
        lang={lang}
        onReset={handleReset}
        // New baggage fields
        baggageType={baggageType}
        baggageTypeOther={baggageTypeOther}
        baggageWeight={baggageWeight}
        isFragile={isFragile}
        paymentStatus={paymentStatus}
        pickupAddress={pickupAddress}
      />
    );
  }

  // Already active/delivered/in_transit → redirect appropriately
  if (errorCode === 'already_in_transit') {
    return (
      <div className="text-center py-12 space-y-4 animate-in fade-in duration-300">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
          <span className="text-3xl">🚚</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">{errorMessage}</h2>
        <p className="text-sm text-gray-400 font-mono">#{qrCode}</p>
        <a
          href={`/retrieve/${qrCode}`}
          className="inline-flex items-center gap-2 px-6 h-12 bg-[#FF6B35] hover:bg-[#e65a28] text-white rounded-xl font-semibold text-sm transition-colors no-underline shadow-lg shadow-orange-500/20"
        >
          🔐 {t('Récupérer le colis', 'Retrieve package')}
        </a>
      </div>
    );
  }

  if (['already_delivered', 'already_active'].includes(errorCode || '')) {
    return (
      <div className="text-center py-12 space-y-4 animate-in fade-in duration-300">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">{errorMessage}</h2>
        <p className="text-sm text-gray-400 font-mono">#{qrCode}</p>
        <a
          href={`/activate/${qrCode}`}
          className="inline-flex items-center gap-2 px-6 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-colors no-underline"
        >
          🔍 {t('Voir le suivi', 'View tracking')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Error banner */}
      {errorCode && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-lg mt-0.5">🚨</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {errorCode === 'network' || errorCode === 'server_error'
                ? t("Échec de l'activation", 'Activation failed')
                : t('Erreur de validation', 'Validation error')}
            </p>
            <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => { setErrorCode(null); setErrorMessage(''); }}
            className="text-red-400 hover:text-red-600 text-xl leading-none"
            aria-label={t('Fermer', 'Close')}
          >
            &times;
          </button>
        </div>
      )}

      {/* CARTE 1 : ITINÉRAIRE & RETRAIT */}
      <VoyageSection
        transportType={transportType} setTransportType={setTransportType}
        company={company} setCompany={setCompany}
        departureCity={departureCity} setDepartureCity={setDepartureCity}
        arrivalCity={arrivalCity} setArrivalCity={setArrivalCity}
        departureDate={departureDate} setDepartureDate={setDepartureDate}
        departureTime={departureTime} setDepartureTime={setDepartureTime}
        pickupAddress={pickupAddress} setPickupAddress={setPickupAddress}
        estimatedArrival={estimatedArrival} setEstimatedArrival={setEstimatedArrival}
        paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus}
        driverPhone={driverPhone} setDriverPhone={setDriverPhone}
        shareDriverPhone={shareDriverPhone} setShareDriverPhone={setShareDriverPhone}
        driverPhoneError={driverPhoneError}
        lang={lang}
      />

      {/* CARTE 2 : EXPÉDITEUR & COLIS */}
      <SenderSection
        senderName={senderName} setSenderName={setSenderName}
        senderPhone={senderPhone} setSenderPhone={setSenderPhone}
        phoneError={senderPhoneError}
        lang={lang}
        baggageType={baggageType} setBaggageType={setBaggageType}
        baggageTypeOther={baggageTypeOther} setBaggageTypeOther={setBaggageTypeOther}
        baggageWeight={baggageWeight} setBaggageWeight={setBaggageWeight}
        baggageDimensions={baggageDimensions} setBaggageDimensions={setBaggageDimensions}
        baggageColor={baggageColor} setBaggageColor={setBaggageColor}
        contentCategory={contentCategory} setContentCategory={setContentCategory}
        declaredValue={declaredValue} setDeclaredValue={setDeclaredValue}
        isFragile={isFragile} setIsFragile={setIsFragile}
        hasProhibited={hasProhibited} setHasProhibited={setHasProhibited}
      />

      {/* CARTE 3 : DESTINATAIRE */}
      <ReceiverSection
        receiverName={receiverName} setReceiverName={setReceiverName}
        receiverPhone={receiverPhone} setReceiverPhone={setReceiverPhone}
        phoneError={receiverPhoneError}
        lang={lang}
      />

      {/* Buttons */}
      <div className="space-y-3 pt-2 pb-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full h-14 bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-green-500/25 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('Enregistrement...', 'Registering...')}
            </>
          ) : (
            <>✅ {t('ACTIVER LE COLIS & GÉNÉRER LES NOTIFICATIONS', 'ACTIVATE PACKAGE & SEND NOTIFICATIONS')}</>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="flex items-center justify-center w-full h-12 border-2 border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
        >
          ❌ {t('Annuler', 'Cancel')}
        </button>
      </div>
    </form>
  );
}
