import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reference = (id || '').toUpperCase().trim();

    if (!reference) {
      return NextResponse.json(
        { error: 'missing_reference', message: 'Référence manquante.' },
        { status: 400 }
      );
    }

    // Find colis by reference
    const colis = await db.baggage.findUnique({
      where: { reference },
      include: { agency: true },
    });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce colis n\'existe pas.' },
        { status: 404 }
      );
    }

    // Fetch all events for this colis, ordered by date
    const events = await db.colisEvent.findMany({
      where: { baggageId: colis.id },
      orderBy: { createdAt: 'asc' },
    });

    // Reconstruct timeline from both events AND colis fields (for older colis without events)
    const timeline: Array<{
      id?: string;
      type: string;
      label: string;
      description: string;
      timestamp: string;
      icon: string;
      color: string;
      recipientName?: string | null;
      recipientPhone?: string | null;
      recipientType?: string;
      messageContent?: string;
      waLink?: string | null;
      metadata?: string | null;
    }> = [];

    // If no events exist, reconstruct from colis fields
    if (events.length === 0) {
      // Step 1: Colis created
      if (colis.createdAt) {
        timeline.push({
          type: 'created',
          label: '📦 Code QR généré',
          description: `Le code QR ${colis.reference} a été créé.`,
          timestamp: colis.createdAt.toISOString(),
          icon: 'package',
          color: '#6b7280',
        });
      }

      // Step 2: Activation
      if (colis.status !== 'pending_activation') {
        const activationTime = colis.departureDate || colis.updatedAt;
        if (activationTime) {
          timeline.push({
            type: 'activation',
            label: '🚀 Colis activé',
            description: `Colis activé pour le trajet ${colis.departureCity || '—'} → ${colis.destination || '—'}`,
            timestamp: activationTime.toISOString(),
            icon: 'rocket',
            color: '#10b981',
            recipientName: colis.travelerFirstName,
            recipientType: 'sender',
          });

          timeline.push({
            type: 'activation',
            label: '📱 WhatsApp envoyé — Expéditeur',
            description: 'Notification de départ envoyée à l\'expéditeur.',
            timestamp: activationTime.toISOString(),
            icon: 'message-circle',
            color: '#10b981',
            recipientName: colis.travelerFirstName,
            recipientType: 'sender',
          });

          timeline.push({
            type: 'activation',
            label: '📱 WhatsApp envoyé — Destinataire (avec PIN)',
            description: 'Notification de transit + code PIN envoyée au destinataire.',
            timestamp: activationTime.toISOString(),
            icon: 'message-circle',
            color: '#f97316',
            recipientName: colis.receiverName,
            recipientType: 'receiver',
          });
        }
      }

      // Step 3: Arrival
      if (colis.arrivedAt) {
        timeline.push({
          type: 'arrival',
          label: '📍 Arrivée confirmée',
          description: `Colis arrivé à ${colis.deliveryLocation || '—'}`,
          timestamp: colis.arrivedAt.toISOString(),
          icon: 'map-pin',
          color: '#f97316',
        });
      }

      // Step 4: Delivery
      if (colis.deliveredAt) {
        timeline.push({
          type: 'delivery',
          label: '✅ Livraison confirmée',
          description: 'Le destinataire a retiré le colis avec le code PIN.',
          timestamp: colis.deliveredAt.toISOString(),
          icon: 'check-circle',
          color: '#10b981',
        });
      }
    } else {
      // Use actual events from DB
      for (const event of events) {
        const colorMap: Record<string, string> = {
          activation: '#10b981',
          pin_generated: '#8b5cf6',
          arrival: '#f97316',
          delivery: '#10b981',
        };

        timeline.push({
          id: event.id,
          type: event.eventType,
          label: event.messageTitle,
          description: event.messageContent,
          timestamp: event.createdAt.toISOString(),
          icon: getEventIcon(event.eventType, event.recipientType),
          color: colorMap[event.eventType] || '#6b7280',
          recipientName: event.recipientName,
          recipientPhone: event.recipientPhone,
          recipientType: event.recipientType,
          messageContent: event.messageContent,
          waLink: event.waLink,
          metadata: event.metadata,
        });
      }
    }

    // Status mapping
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      pending_activation: { label: 'En attente d\'activation', color: '#6b7280', icon: 'clock' },
      in_transit: { label: 'En transit', color: '#f97316', icon: 'truck' },
      delivered: { label: 'Livré', color: '#10b981', icon: 'check-circle' },
      active: { label: 'Actif', color: '#3b82f6', icon: 'check' },
      scanned: { label: 'Scanné', color: '#8b5cf6', icon: 'scan' },
      lost: { label: 'Perdu', color: '#ef4444', icon: 'alert-triangle' },
      found: { label: 'Trouvé', color: '#10b981', icon: 'search' },
      blocked: { label: 'Bloqué', color: '#ef4444', icon: 'x-circle' },
    };

    const currentStatus = statusMap[colis.status] || statusMap.pending_activation;

    // Transport icon
    const transportIcons: Record<string, string> = {
      bus: '🚌',
      flight: '✈️',
      train: '🚆',
      boat: '🚢',
    };

    // Fetch PassengerTicket data if category is 'ticket'
    let ticket = null;
    if (colis.category === 'ticket') {
      ticket = await db.passengerTicket.findUnique({
        where: { baggageId: colis.id },
        select: {
          passengerName: true, passengerAge: true, documentType: true, documentNumber: true,
          destination: true, seatNumber: true, platform: true, departureTime: true,
          luggageCount: true, luggageWeightKg: true, luggageFee: true,
          controlCode: true, ticketStatus: true, activatedAt: true,
        }
      });
    }

    return NextResponse.json({
      success: true,
      colis: {
        reference: colis.reference,
        status: colis.status,
        category: colis.category,
        statusLabel: currentStatus.label,
        statusColor: currentStatus.color,
        statusIcon: currentStatus.icon,
        transportMode: colis.transportMode,
        transportIcon: transportIcons[colis.transportMode] || '🚌',
        company: colis.busCompany || colis.airlineName || colis.trainCompany || colis.shipName || '—',
        departureCity: colis.departureCity || '—',
        arrivalCity: colis.destination || '—',
        departureDate: colis.departureDate,
        departureTime: colis.departureTime,
        senderName: colis.travelerFirstName || '—',
        receiverName: colis.receiverName || '—',
        createdAt: colis.createdAt,
        arrivedAt: colis.arrivedAt,
        deliveredAt: colis.deliveredAt,
        deliveryLocation: colis.deliveryLocation,
        // Driver phone: NEVER expose if consent = false (security)
        driverPhone: colis.shareDriverPhone ? (colis.driverPhone || null) : null,
        shareDriverPhone: colis.shareDriverPhone,
      },
      ticket,
      timeline,
      totalEvents: timeline.length,
    });

  } catch (error) {
    console.error('[/api/tracking] Error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

function getEventIcon(eventType: string, recipientType: string): string {
  if (recipientType === 'system') {
    switch (eventType) {
      case 'pin_generated': return 'lock';
      case 'arrival': return 'map-pin';
      default: return 'info';
    }
  }
  return 'message-circle';
}
