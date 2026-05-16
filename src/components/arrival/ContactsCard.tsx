'use client';

import { Phone, MessageCircle } from 'lucide-react';

interface ContactsCardProps {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  reference: string;
  lang: 'fr' | 'en';
}

export default function ContactsCard({
  senderName, senderPhone, receiverName, receiverPhone, reference, lang,
}: ContactsCardProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const cleanPhone = (p: string) => p.replace(/[^0-9]/g, '');

  // Generic WhatsApp messages for direct contact
  const senderWaMsg = lang === 'fr'
    ? `Bonjour ${senderName}, concernant votre colis #${reference}.`
    : `Hello ${senderName}, regarding your package #${reference}.`;

  const receiverWaMsg = lang === 'fr'
    ? `Bonjour ${receiverName}, concernant votre colis #${reference}.`
    : `Hello ${receiverName}, regarding your package #${reference}.`;

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 border-l-4 border-l-gray-300">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        👥 {t('Contacts', 'Contacts')}
      </h2>

      <div className="space-y-4">
        {/* ENVOYEUR */}
        <div className="bg-[#F8FAFC] rounded-lg p-4">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-wider mb-2">
            📤 {t('Envoyeur', 'Sender')}
          </p>
          <p className="font-semibold text-gray-900 text-sm">{senderName || '—'}</p>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{senderPhone || '—'}</p>

          {senderPhone && (
            <div className="flex gap-2 mt-3">
              <a
                href={`tel:${senderPhone}`}
                className="inline-flex items-center gap-1.5 px-3 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors no-underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {t('Appeler', 'Call')}
              </a>
              <a
                href={`https://wa.me/${cleanPhone(senderPhone)}?text=${encodeURIComponent(senderWaMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-10 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-xs font-semibold transition-colors no-underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* RECEVEUR */}
        <div className="bg-[#F8FAFC] rounded-lg p-4">
          <p className="text-xs font-bold text-[#0077B6] uppercase tracking-wider mb-2">
            📥 {t('Receveur', 'Receiver')}
          </p>
          <p className="font-semibold text-gray-900 text-sm">{receiverName || '—'}</p>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{receiverPhone || '—'}</p>

          {receiverPhone && (
            <div className="flex gap-2 mt-3">
              <a
                href={`tel:${receiverPhone}`}
                className="inline-flex items-center gap-1.5 px-3 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors no-underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {t('Appeler', 'Call')}
              </a>
              <a
                href={`https://wa.me/${cleanPhone(receiverPhone)}?text=${encodeURIComponent(receiverWaMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-10 bg-[#0077B6]/10 hover:bg-[#0077B6]/20 text-[#0077B6] rounded-lg text-xs font-semibold transition-colors no-underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
