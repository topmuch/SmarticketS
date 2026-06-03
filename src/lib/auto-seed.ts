/**
 * Auto-seed utility — populates the database with demo data on first request
 * in production when no stations exist. This ensures the demo works online
 * without needing to manually run `bun run prisma/seed.ts`.
 */
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SEED_LOCK_KEY = 'auto_seed_completed';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function ensureSeeded(): Promise<boolean> {
  try {
    // 1. Check if seeding already done
    const lock = await db.setting.findUnique({ where: { key: SEED_LOCK_KEY } });
    if (lock && lock.value === 'true') return false;

    // 2. Check if any stations exist (lightweight check)
    const stationCount = await db.station.count();
    if (stationCount > 0) {
      // Mark as seeded to avoid future checks
      await db.setting.upsert({
        where: { key: SEED_LOCK_KEY },
        update: { value: 'true' },
        create: { key: SEED_LOCK_KEY, value: 'true' },
      });
      return false;
    }

    console.log('[auto-seed] No stations found — running auto-seed...');

    // 3. Create settings
    const settings = [
      { key: 'company_name', value: 'SmarticketS' },
      { key: 'company_address', value: 'Dakar, Sénégal' },
      { key: 'company_phone', value: '+221 78 485 82 26' },
      { key: 'company_email', value: 'contact@smartickets.com' },
      { key: 'boardingAlertThresholdMinutes', value: '5' },
      { key: 'signage_stationName', value: 'Gare Routière Peters' },
      { key: 'signage_alertSoundEnabled', value: 'true' },
    ];
    for (const setting of settings) {
      await db.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    // 4. Create agency
    const agency = await db.agency.upsert({
      where: { slug: 'ashraf_voyages' },
      update: {},
      create: {
        id: 'demo-agency-1',
        name: 'Ashraf Voyages',
        slug: 'ashraf_voyages',
        email: 'contact@ashrafvoyages.com',
        phone: '+221 78 00 00 00',
        address: 'Dakar, Sénégal',
      },
    });

    // 5. Create stations
    const stationPeters = await db.station.upsert({
      where: { slug: 'dakar-peters' },
      update: {},
      create: {
        id: 'station-dakar-peters',
        name: 'Gare Routière Peters',
        slug: 'dakar-peters',
        city: 'Dakar',
        address: 'Avenue Blaise Diagne, Peters',
        agencyId: agency.id,
      },
    });

    // Create destination stations
    const destinationCities = ['Mbour', 'Saint-Louis', 'Thiès', 'Touba', 'Kaolack', 'Ziguinchor'];
    const stationMap: Record<string, string> = {};
    for (const city of destinationCities) {
      const slug = city.toLowerCase();
      const destStation = await db.station.upsert({
        where: { slug },
        update: {},
        create: {
          id: `station-${slug}`,
          name: `Gare de ${city}`,
          slug,
          city,
          agencyId: agency.id,
        },
      });
      stationMap[city] = destStation.id;
    }

    // 6. Create users
    await db.user.upsert({
      where: { email: 'admin@smartickets.com' },
      update: {},
      create: {
        email: 'admin@smartickets.com',
        name: 'SuperAdmin',
        password: await hashPassword('admin123'),
        role: 'superadmin',
      },
    });
    await db.user.upsert({
      where: { email: 'agency@smartickets.com' },
      update: {},
      create: {
        email: 'agency@smartickets.com',
        name: 'Chef Agence',
        password: await hashPassword('agence123'),
        role: 'agency',
        agencyId: agency.id,
      },
    });

    // 7. Create routes
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const routeData = [
      { name: 'Dakar ↔ Mbour', origin: 'Dakar', destination: 'Mbour', isRoundTrip: true, durationMinutes: 90, distanceKm: 80, price: 5000 },
      { name: 'Dakar ↔ Saint-Louis', origin: 'Dakar', destination: 'Saint-Louis', isRoundTrip: true, durationMinutes: 270, distanceKm: 265, price: 15000 },
      { name: 'Dakar ↔ Ziguinchor', origin: 'Dakar', destination: 'Ziguinchor', isRoundTrip: false, durationMinutes: 600, distanceKm: 500, price: 25000 },
      { name: 'Dakar ↔ Thiès', origin: 'Dakar', destination: 'Thiès', isRoundTrip: true, durationMinutes: 75, distanceKm: 70, price: 3500 },
      { name: 'Dakar ↔ Touba', origin: 'Dakar', destination: 'Touba', isRoundTrip: true, durationMinutes: 180, distanceKm: 195, price: 7000 },
      { name: 'Dakar ↔ Kaolack', origin: 'Dakar', destination: 'Kaolack', isRoundTrip: true, durationMinutes: 240, distanceKm: 190, price: 10000 },
    ];

    const routes: Record<string, string> = {};
    for (const rd of routeData) {
      const route = await db.route.upsert({
        where: { id: `${agency.id}-route-${rd.origin}-${rd.destination}` },
        update: {},
        create: {
          id: `${agency.id}-route-${rd.origin}-${rd.destination}`,
          name: rd.name,
          origin: rd.origin,
          destination: rd.destination,
          isRoundTrip: rd.isRoundTrip,
          durationMinutes: rd.durationMinutes,
          distanceKm: rd.distanceKm,
          price: rd.price,
          agencyId: agency.id,
        },
      });
      routes[rd.name] = route.id;
    }

    // 8. Create departures for today + future hours
    const departureData = [
      { routeName: 'Dakar ↔ Mbour', lineNumber: 'Ligne 1', hours: [6, 7, 8, 9, 10, 12, 14, 16, 18], platforms: ['A1', 'A2', 'A1', 'A2', 'A1', 'A3', 'A1', 'A2', 'A3'] },
      { routeName: 'Dakar ↔ Saint-Louis', lineNumber: 'Ligne 2', hours: [7, 9, 20, 22], platforms: ['B1', 'B1', 'B2', 'B2'] },
      { routeName: 'Dakar ↔ Thiès', lineNumber: 'Ligne 3', hours: [6, 7, 8, 10, 12, 15, 17, 19], platforms: ['C1', 'C2', 'C1', 'C2', 'C1', 'C2', 'C1', 'C2'] },
      { routeName: 'Dakar ↔ Touba', lineNumber: 'Ligne 5', hours: [6, 7, 8, 20, 22], platforms: ['D1', 'D2', 'D1', 'D1', 'D2'] },
      { routeName: 'Dakar ↔ Kaolack', lineNumber: 'Ligne 6', hours: [7, 8, 10, 14, 18], platforms: ['E1', 'E2', 'E1', 'E2', 'E1'] },
      { routeName: 'Dakar ↔ Ziguinchor', lineNumber: 'Ligne 7', hours: [8, 20], platforms: ['F1', 'F2'] },
    ];

    for (const dd of departureData) {
      const routeId = routes[dd.routeName];
      if (!routeId) continue;

      for (let i = 0; i < dd.hours.length; i++) {
        const scheduledTime = new Date(today);
        scheduledTime.setHours(dd.hours[i], 0, 0, 0);

        const isPast = scheduledTime.getTime() < now.getTime() - 30 * 60000;
        const seats = Math.floor(Math.random() * 30) + 5;

        await db.departure.upsert({
          where: { id: `dep-${routeId}-${dd.hours[i]}` },
          update: { originStationId: stationPeters.id },
          create: {
            id: `dep-${routeId}-${dd.hours[i]}`,
            routeId,
            originStationId: stationPeters.id,
            destinationStationId: stationMap[routeData.find(r => r.name === dd.routeName)?.destination || ''] || null,
            lineNumber: dd.lineNumber,
            destination: routeData.find(r => r.name === dd.routeName)?.destination || '',
            scheduledTime,
            platform: dd.platforms[i] || '-',
            availableSeats: isPast ? 0 : seats,
            totalSeats: 45,
            status: isPast ? 'DEPARTED' : 'SCHEDULED',
            departureType: 'OUTBOUND',
            agencyId: agency.id,
          },
        });

        // Create return trips for round-trip routes
        const routeInfo = routeData.find(r => r.name === dd.routeName);
        if (routeInfo?.isRoundTrip && dd.hours[i] <= 12) {
          const returnHour = dd.hours[i] + 8 + Math.floor(Math.random() * 3);
          if (returnHour <= 23) {
            const returnTime = new Date(today);
            returnTime.setHours(returnHour, 30, 0, 0);
            const isReturnPast = returnTime.getTime() < now.getTime() - 30 * 60000;
            const destCity = routeInfo.origin;

            await db.departure.upsert({
              where: { id: `dep-${routeId}-ret-${dd.hours[i]}` },
              update: {},
              create: {
                id: `dep-${routeId}-ret-${dd.hours[i]}`,
                routeId,
                originStationId: stationMap[routeInfo.destination] || null,
                destinationStationId: stationMap[destCity] || stationPeters.id,
                lineNumber: dd.lineNumber,
                destination: destCity,
                scheduledTime: returnTime,
                platform: dd.platforms[i] || '-',
                availableSeats: isReturnPast ? 0 : Math.floor(Math.random() * 25) + 10,
                totalSeats: 45,
                status: isReturnPast ? 'DEPARTED' : 'SCHEDULED',
                departureType: 'RETURN',
                agencyId: agency.id,
              },
            });
          }
        }
      }
    }

    // 9. Create demo PassengerTickets + Baggage for "Passager Manquant" feature
    //    Create a departure scheduled ~10 min from now to trigger the alert
    const nearFuture = new Date(now.getTime() + 10 * 60_000); // 10 min from now
    const demoRouteId = routes['Dakar ↔ Mbour'];
    const demoDepartureId = demoRouteId ? `dep-${demoRouteId}-demo-missing` : `dep-demo-missing-alert`;

    // Create the demo departure
    await db.departure.upsert({
      where: { id: demoDepartureId },
      update: { scheduledTime: nearFuture },
      create: {
        id: demoDepartureId,
        routeId: demoRouteId || undefined,
        originStationId: stationPeters.id,
        destinationStationId: stationMap['Mbour'] || null,
        lineNumber: 'Ligne 1',
        destination: 'Mbour',
        scheduledTime: nearFuture,
        platform: 'A1',
        availableSeats: 38,
        totalSeats: 45,
        status: 'SCHEDULED',
        departureType: 'OUTBOUND',
        agencyId: agency.id,
      },
    });

    // Passenger names for demo data
    const demoPassengers = [
      { name: 'Amadou Diallo', phone: '+221771234501', age: 35, doc: 'CNI', docNum: 'SN001234', seat: 'A1', validated: true },
      { name: 'Fatou Sow', phone: '+221771234502', age: 28, doc: 'Passeport', docNum: 'PS002345', seat: 'A2', validated: true },
      { name: 'Ibrahima Ndiaye', phone: '+221771234503', age: 42, doc: 'CNI', docNum: 'SN003456', seat: 'A3', validated: true },
      { name: 'Aissatou Ba', phone: '+221771234504', age: 25, doc: 'CNI', docNum: 'SN004567', seat: 'B1', validated: false },
      { name: 'Moussa Faye', phone: '+221771234505', age: 30, doc: 'Passeport', docNum: 'PS005678', seat: 'B2', validated: false },
      { name: 'Mariama Sy', phone: '+221771234506', age: 22, doc: 'CNI', docNum: 'SN006789', seat: 'B3', validated: false },
      { name: 'Ousmane Diop', phone: '+221771234507', age: 55, doc: 'CNI', docNum: 'SN007890', seat: 'C1', validated: false },
    ];

    for (let i = 0; i < demoPassengers.length; i++) {
      const p = demoPassengers[i];
      const ref = `VOL26-DEMO${String(i + 1).padStart(3, '0')}`;

      // Create Baggage first (required for PassengerTicket.baggageId)
      const baggage = await db.baggage.upsert({
        where: { reference: ref },
        update: {},
        create: {
          reference: ref,
          type: 'voyageur',
          category: 'ticket',
          transportMode: 'bus',
          busCompany: 'Ashraf Voyages',
          destination: 'Mbour',
          departureCity: 'Dakar',
          departureTime: `${String(nearFuture.getHours()).padStart(2, '0')}:${String(nearFuture.getMinutes()).padStart(2, '0')}`,
          status: p.validated ? 'scanned' : 'active',
          travelerFirstName: p.name.split(' ')[0],
          travelerLastName: p.name.split(' ').slice(1).join(' '),
          stationId: stationPeters.id,
          agencyId: agency.id,
        },
      });

      // Create PassengerTicket
      await db.passengerTicket.upsert({
        where: { baggageId: baggage.id },
        update: {},
        create: {
          baggageId: baggage.id,
          agencyId: agency.id,
          departureId: demoDepartureId,
          passengerName: p.name,
          passengerPhone: p.phone,
          passengerAge: p.age,
          documentType: p.doc,
          documentNumber: p.docNum,
          destination: 'Mbour',
          seatNumber: p.seat,
          platform: 'A1',
          ticketStatus: p.validated ? 'USED' : 'ACTIVE',
          validatedAt: p.validated ? new Date(now.getTime() - 30 * 60_000) : null,
          validatedBy: p.validated ? 'Contrôle Gare' : null,
          controlCode: `CTRL-${ref}`,
          activatedAt: new Date(now.getTime() - 2 * 60 * 60_000),
        },
      });
    }

    // 10. Mark as seeded
    await db.setting.upsert({
      where: { key: SEED_LOCK_KEY },
      update: { value: 'true' },
      create: { key: SEED_LOCK_KEY, value: 'true' },
    });

    console.log('[auto-seed] ✅ Demo data seeded successfully (with missing passenger test data)');
    return true;
  } catch (error) {
    console.error('[auto-seed] Error:', error);
    return false;
  }
}
