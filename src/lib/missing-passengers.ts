/**
 * Missing Passengers Module
 *
 * Detects passengers with sold/active tickets who haven't been validated (scanned)
 * within 15 minutes of a departure. Used by the dashboard alert system.
 */

import { db } from '@/lib/db';

export interface MissingPassenger {
  passengerName: string;
  seatNumber: string;
  ticketId: string;
  baggageId: string;
  controlCode: string;
  passengerPhone: string;
  status: 'MISSING';
}

export interface TripMissingSummary {
  departureId: string;
  destination: string;
  lineNumber: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  totalSold: number;
  totalScanned: number;
  missingCount: number;
  minutesBeforeDeparture: number;
  isAlertTriggered: boolean;
  missingPassengers: MissingPassenger[];
}

/**
 * Core function: get missing passengers for a specific departure/trip.
 *
 * Logic:
 *  1. Find tickets with status ACTIVE (sold but not validated) for the given departure
 *  2. Compare sold vs validated to determine missing count
 *  3. Check if within 15-minute alert window
 *
 * @param departureId - The Departure ID (trip)
 * @returns TripMissingSummary with missing passengers list
 */
export async function getMissingPassengers(
  departureId: string
): Promise<TripMissingSummary | null> {
  const departure = await db.departure.findUnique({
    where: { id: departureId },
    include: {
      route: { select: { name: true, origin: true, destination: true } },
      tickets: {
        where: {
          ticketStatus: { in: ['ACTIVE', 'USED'] },
        },
        select: {
          id: true,
          baggageId: true,
          passengerName: true,
          passengerPhone: true,
          seatNumber: true,
          controlCode: true,
          ticketStatus: true,
          validatedAt: true,
        },
      },
    },
  });

  if (!departure) return null;

  const now = new Date();
  const scheduledTime = new Date(departure.scheduledTime);
  const delayMs = departure.delayMinutes ? departure.delayMinutes * 60_000 : 0;
  const effectiveTime = new Date(scheduledTime.getTime() + delayMs);
  const diffMin = Math.floor((effectiveTime.getTime() - now.getTime()) / 60_000);

  const totalSold = departure.tickets.length;
  const totalScanned = departure.tickets.filter(
    (t) => t.ticketStatus === 'USED' && t.validatedAt
  ).length;
  const missingCount = totalSold - totalScanned;

  // Alert triggered: within 15 min of departure (or departed < 1h ago) and has missing
  const isAlertTriggered = diffMin <= 15 && diffMin > -60 && missingCount > 0;

  const missingPassengers: MissingPassenger[] = departure.tickets
    .filter((t) => t.ticketStatus === 'ACTIVE')
    .map((t) => ({
      passengerName: t.passengerName,
      seatNumber: t.seatNumber,
      ticketId: t.id,
      baggageId: t.baggageId,
      controlCode: t.controlCode,
      passengerPhone: t.passengerPhone,
      status: 'MISSING' as const,
    }));

  return {
    departureId: departure.id,
    destination: departure.destination,
    lineNumber: departure.lineNumber,
    scheduledTime: scheduledTime.toISOString(),
    effectiveTime: effectiveTime.toISOString(),
    platform: departure.platform,
    status: departure.status,
    delayMinutes: departure.delayMinutes || 0,
    totalSold,
    totalScanned,
    missingCount,
    minutesBeforeDeparture: diffMin,
    isAlertTriggered,
    missingPassengers,
  };
}

/**
 * Scans all departures for a given agency in the next 2 hours
 * and returns those with missing passengers within the 15-min alert window.
 *
 * @param agencyId - Agency to scan for
 * @returns Array of TripMissingSummary (only those with alerts triggered)
 */
export async function scanAgencyForMissingAlerts(
  agencyId: string
): Promise<TripMissingSummary[]> {
  const now = new Date();

  const windowStart = new Date(now.getTime() - 60 * 60_000); // 1h ago
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60_000); // 2h ahead

  const departures = await db.departure.findMany({
    where: {
      agencyId,
      scheduledTime: { gte: windowStart, lte: windowEnd },
      status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] },
    },
    include: {
      tickets: {
        where: {
          ticketStatus: { in: ['ACTIVE', 'USED'] },
        },
        select: {
          id: true,
          baggageId: true,
          passengerName: true,
          passengerPhone: true,
          seatNumber: true,
          controlCode: true,
          ticketStatus: true,
          validatedAt: true,
        },
      },
    },
    orderBy: { scheduledTime: 'asc' },
  });

  return departures
    .map((dep) => {
      const scheduled = new Date(dep.scheduledTime);
      const delayMs = dep.delayMinutes ? dep.delayMinutes * 60_000 : 0;
      const effective = new Date(scheduled.getTime() + delayMs);
      const diffMin = Math.floor((effective.getTime() - now.getTime()) / 60_000);

      const totalSold = dep.tickets.length;
      const totalScanned = dep.tickets.filter(
        (t) => t.ticketStatus === 'USED' && t.validatedAt
      ).length;
      const missingCount = totalSold - totalScanned;

      const isAlert = diffMin <= 15 && diffMin > -60 && missingCount > 0;

      return {
        departureId: dep.id,
        destination: dep.destination,
        lineNumber: dep.lineNumber,
        scheduledTime: scheduled.toISOString(),
        effectiveTime: effective.toISOString(),
        platform: dep.platform,
        status: dep.status,
        delayMinutes: dep.delayMinutes || 0,
        totalSold,
        totalScanned,
        missingCount,
        minutesBeforeDeparture: diffMin,
        isAlertTriggered: isAlert,
        missingPassengers: dep.tickets
          .filter((t) => t.ticketStatus === 'ACTIVE')
          .map((t) => ({
            passengerName: t.passengerName,
            seatNumber: t.seatNumber,
            ticketId: t.id,
            baggageId: t.baggageId,
            controlCode: t.controlCode,
            passengerPhone: t.passengerPhone,
            status: 'MISSING' as const,
          })),
      };
    })
    .filter((a) => a.isAlertTriggered);
}

/**
 * Mark a passenger as present (validate ticket without scan).
 *
 * @param ticketId - PassengerTicket ID
 * @param validatorName - Name of the person marking present
 * @returns Updated ticket info
 */
export async function markPassengerPresent(
  ticketId: string,
  validatorName: string = 'Agence'
): Promise<{
  success: boolean;
  passengerName: string;
  seatNumber: string;
  controlCode: string;
} | null> {
  const ticket = await db.passengerTicket.findUnique({
    where: { id: ticketId },
    include: {
      baggage: { select: { id: true, status: true, reference: true } },
    },
  });

  if (!ticket || ticket.ticketStatus !== 'ACTIVE') return null;

  // Validate the ticket
  await db.passengerTicket.update({
    where: { id: ticketId },
    data: {
      ticketStatus: 'USED',
      validatedAt: new Date(),
      validatedBy: validatorName,
    },
  });

  // Update baggage status
  if (ticket.baggage && ticket.baggage.status === 'active') {
    await db.baggage.update({
      where: { id: ticket.baggage.id },
      data: { status: 'scanned' },
    });
  }

  // Update departure available seats
  if (ticket.departureId) {
    const departure = await db.departure.findUnique({
      where: { id: ticket.departureId },
      select: { availableSeats: true },
    });
    if (departure && departure.availableSeats > 0) {
      await db.departure.update({
        where: { id: ticket.departureId },
        data: { availableSeats: { decrement: 1 } },
      });
    }
  }

  return {
    success: true,
    passengerName: ticket.passengerName,
    seatNumber: ticket.seatNumber,
    controlCode: ticket.controlCode,
  };
}
