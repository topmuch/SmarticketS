/**
 * QRTrans — Système Centralisé de Notifications WhatsApp
 *
 * 4 templates professionnels :
 *   1. departure_sender   — Départ → Expéditeur (🟢)
 *   2. departure_receiver — Départ → Destinataire (🔵)
 *   3. arrival_sender     — Arrivée → Expéditeur (🟢)
 *   4. arrival_receiver   — Arrivée → Destinataire (🔵)
 *
 * Formatage WhatsApp-compatible :
 *   - *gras* pour les titres/noms
 *   - Emojis comme icônes visuelles
 *   - Sauts de ligne avec \n
 *   - Séparateurs visuels
 */

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

export type NotificationType =
  | 'departure_sender'
  | 'departure_receiver'
  | 'arrival_sender'
  | 'arrival_receiver';

export interface NotificationVars {
  reference: string;
  sender_name: string;
  sender_whatsapp: string;
  receiver_name: string;
  receiver_whatsapp: string;
  company_name: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  arrived_date?: string;
  arrived_time?: string;
  delivery_location?: string;
  tracking_url: string;
  feedback_url?: string;
}

// ═══════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════

/**
 * Nettoie un numéro de téléphone : supprime tout sauf chiffres et + initial
 */
export const cleanPhone = (phone: string): string => {
  return phone.replace(/[^0-9+]/g, '').replace(/^0+/, '');
};

/**
 * Génère un lien wa.me complet avec message pré-rempli
 */
export const generateWaMeLink = (phone: string, message: string): string => {
  const clean = cleanPhone(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};

/**
 * Formate une date ISO en format lisible FR (JJ/MM/AAAA)
 */
export const formatDateFR = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

/**
 * Formate une heure HH:mm
 */
export const formatTime = (time: string): string => {
  if (!time) return '';
  // If it's HH:mm format, return as-is
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  try {
    const d = new Date(time);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return time;
  }
};

// ═══════════════════════════════════════════════════════
//  4 TEMPLATS DE NOTIFICATION
// ═══════════════════════════════════════════════════════

/**
 * Séparateur visuel WhatsApp
 */
const SEPARATOR = '────────';

export const NOTIFICATION_TEMPLATES: Record<NotificationType, (vars: NotificationVars) => string> = {

  // ─── NOTIFICATION 1 : DÉPART → ENVOYEUR ───
  departure_sender: (v) =>
`🟢 *QRTrans — Colis en Partance*

Bonjour *${v.sender_name}*,

Votre colis a été pris en charge et est en cours de route.

📦 Référence : *${v.reference}*
🚌 Compagnie : ${v.company_name}
📍 Trajet : ${v.departure_city} → ${v.arrival_city}
🕐 Départ : ${v.departure_date} à ${v.departure_time}

Vous recevrez une confirmation à l'arrivée.
Merci d'avoir utilisé QRTrans. 🙏

${SEPARATOR}
🔗 Suivre : ${v.tracking_url}`,

  // ─── NOTIFICATION 2 : DÉPART → RECEVEUR ───
  departure_receiver: (v) =>
`🔵 *QRTrans — Colis en Transit*

Bonjour *${v.receiver_name}*,

Un colis vous étant destiné est en route vers vous.

📦 Référence : *${v.reference}*
👤 Expéditeur : ${v.sender_name}
🚌 Compagnie : ${v.company_name}
📍 Destination : ${v.arrival_city}
🕐 Arrivée estimée : ${v.departure_date}

Vous serez notifié dès l'arrivée pour le retrait.
À très bientôt ! 🤝

${SEPARATOR}
🔗 Suivre : ${v.tracking_url}`,

  // ─── NOTIFICATION 3 : ARRIVÉE → ENVOYEUR ───
  arrival_sender: (v) =>
`🟢 *QRTrans — Colis Livré ✅*

Bonjour *${v.sender_name}*,

Bonne nouvelle ! Votre colis a bien été livré.

📦 Référence : *${v.reference}*
📍 Lieu de livraison : *${v.delivery_location || 'Non renseigné'}*
✅ Livré le : ${v.arrived_date || ''} à ${v.arrived_time || ''}
👤 Destinataire : ${v.receiver_name}

Merci de votre confiance. QRTrans vous souhaite une excellente journée. 🙏

${SEPARATOR}
⭐ Évaluer le service : ${v.feedback_url || ''}`,

  // ─── NOTIFICATION 4 : ARRIVÉE → RECEVEUR ───
  arrival_receiver: (v) =>
`🔵 *QRTrans — Colis à Retirer 📦*

Bonjour *${v.receiver_name}*,

Votre colis est *ARRIVÉ* et vous attend !

📦 Référence : *${v.reference}*
📍 Point de retrait : *${v.delivery_location || 'Non renseigné'}*
🕐 Horaires : 08h00 - 18h00
✅ Arrivé le : ${v.arrived_date || ''} à ${v.arrived_time || ''}

📞 Besoin d'aide ? Contactez ${v.company_name}

${SEPARATOR}
🔗 Suivre : ${v.tracking_url}

Merci d'utiliser QRTrans. 🤝`,
};

// ═══════════════════════════════════════════════════════
//  FONCTIONS PRINCIPALES
// ═══════════════════════════════════════════════════════

/**
 * Génère un lien wa.me complet pour une notification donnée
 */
export const createNotificationLink = (
  type: NotificationType,
  phone: string,
  vars: NotificationVars
): string => {
  const template = NOTIFICATION_TEMPLATES[type];
  const message = template(vars);
  return generateWaMeLink(phone, message);
};

/**
 * Génère les 4 liens wa.me pour les 2 notifications de départ (envoyeur + receveur)
 */
export const createDepartureLinks = (vars: NotificationVars) => ({
  sender: createNotificationLink('departure_sender', vars.sender_whatsapp, vars),
  receiver: createNotificationLink('departure_receiver', vars.receiver_whatsapp, vars),
});

/**
 * Génère les 4 liens wa.me pour les 2 notifications d'arrivée (envoyeur + receveur)
 */
export const createArrivalLinks = (vars: NotificationVars) => ({
  sender: createNotificationLink('arrival_sender', vars.sender_whatsapp, vars),
  receiver: createNotificationLink('arrival_receiver', vars.receiver_whatsapp, vars),
});
