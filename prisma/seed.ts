import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Use bcrypt for password hashing (same as auth.ts)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Create settings
  console.log('Creating settings...');
  const settings = [
    { key: 'company_name', value: 'SmarticketS' },
    { key: 'company_address', value: 'Poissy, France' },
    { key: 'company_phone', value: '+33 7 45 34 93 39' },
    { key: 'company_email', value: 'contact@smartickets.com' },
    { key: 'seo_title', value: 'SmarticketS - Protection intelligente des bagages' },
    { key: 'seo_description', value: 'Protégez vos bagages avec un autocollant QR intelligent. Sans application, sans batterie, sans GPS.' },
    { key: 'seo_keywords', value: 'QR, bagage, voyage, protection, sticker' },
    { key: 'languages', value: 'fr,en,ar' },
    { key: 'default_language', value: 'fr' },
    { key: 'currency', value: 'EUR' },
    { key: 'boardingAlertThresholdMinutes', value: '5' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Create demo agency
  console.log('Creating demo agency...');
  const agency = await prisma.agency.upsert({
    where: { slug: 'ashraf_voyages' },
    update: {},
    create: {
      id: 'demo-agency-1',
      name: 'Ashraf Voyages',
      slug: 'ashraf_voyages',
      email: 'contact@ashrafvoyages.com',
      phone: '+33 6 00 00 00 00',
      address: 'Paris, France',
    },
  });

  // ═══════════════════════════════════════════════════════════
  // Create sample Stations (multi-gares)
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample stations...');

  const stationPeters = await prisma.station.upsert({
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

  const stationGuediawaye = await prisma.station.upsert({
    where: { slug: 'guediawaye' },
    update: {},
    create: {
      id: 'station-guediawaye',
      name: 'Gare de Guédiawaye',
      slug: 'guediawaye',
      city: 'Dakar',
      address: 'Carrefour Guédiawaye',
      agencyId: agency.id,
    },
  });

  const stationDiamniadio = await prisma.station.upsert({
    where: { slug: 'diamniadio' },
    update: {},
    create: {
      id: 'station-diamniadio',
      name: 'Gare de Diamniadio',
      slug: 'diamniadio',
      city: 'Diamniadio',
      address: 'Axe Diamniadio',
      agencyId: agency.id,
    },
  });

  console.log(`  ✓ Created ${stationPeters.name}, ${stationGuediawaye.name}, ${stationDiamniadio.name}`);

  // Create superadmin user
  console.log('Creating superadmin user...');
  await prisma.user.upsert({
    where: { email: 'admin@smartickets.com' },
    update: {
      password: await hashPassword('admin123'),
    },
    create: {
      email: 'admin@smartickets.com',
      name: 'SuperAdmin',
      password: await hashPassword('admin123'),
      role: 'superadmin',
    },
  });

  // Create agency user
  console.log('Creating agency user...');
  await prisma.user.upsert({
    where: { email: 'agency@smartickets.com' },
    update: {
      password: await hashPassword('agence123'),
    },
    create: {
      email: 'agency@smartickets.com',
      name: 'Chef Agence',
      password: await hashPassword('agence123'),
      role: 'agency',
      agencyId: agency.id,
    },
  });

  // Create driver user
  console.log('Creating driver user...');
  await prisma.user.upsert({
    where: { email: 'chauffeur@smartickets.com' },
    update: {
      password: await hashPassword('driver123'),
    },
    create: {
      email: 'chauffeur@smartickets.com',
      name: 'Moussa Diop',
      password: await hashPassword('driver123'),
      role: 'driver',
      agencyId: agency.id,
    },
  });

  // Create sample Voyageur baggage (activated)
  console.log('Creating sample baggages...');
  await prisma.baggage.upsert({
    where: { reference: 'VOL25-DEMO01' },
    update: {},
    create: {
      reference: 'VOL25-DEMO01',
      type: 'voyageur',
      agencyId: null,
      travelerFirstName: 'Marie',
      travelerLastName: 'Dupont',
      whatsappOwner: '+33612345678',
      flightNumber: 'AF1234',
      destination: 'Tokyo',
      baggageIndex: 1,
      baggageType: 'cabine',
      status: 'active',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Create sample parcel baggage (pending activation — for testing colis flow)
  await prisma.baggage.upsert({
    where: { reference: 'COLIS25-DEMO01' },
    update: { stationId: stationGuediawaye.id },
    create: {
      reference: 'COLIS25-DEMO01',
      type: 'voyageur',
      category: 'parcel',
      agencyId: agency.id,
      stationId: stationGuediawaye.id,
      baggageIndex: 1,
      baggageType: 'soute',
      status: 'pending_activation',
    },
  });

  // Create sample ticket baggage (pending activation — for testing ticket flow)
  await prisma.baggage.upsert({
    where: { reference: 'TKT25-PENDING' },
    update: { stationId: stationPeters.id },
    create: {
      reference: 'TKT25-PENDING',
      type: 'voyageur',
      category: 'ticket',
      agencyId: agency.id,
      stationId: stationPeters.id,
      baggageIndex: 1,
      baggageType: 'soute',
      status: 'pending_activation',
    },
  });

  // ═══════════════════════════════════════════════════════════
  // Create sample Routes
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample routes...');

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
    const route = await prisma.route.upsert({
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

  // ═══════════════════════════════════════════════════════════
  // Create destination stations for signage display
  // ═══════════════════════════════════════════════════════════
  console.log('Creating destination stations...');
  const destinationCities = ['Mbour', 'Saint-Louis', 'Thiès', 'Touba', 'Kaolack', 'Ziguinchor'];
  const stationMap: Record<string, string> = {};
  for (const city of destinationCities) {
    const slug = city.toLowerCase();
    const destStation = await prisma.station.upsert({
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
    console.log(`  ✓ ${destStation.name}`);
  }

  // ═══════════════════════════════════════════════════════════
  // Create sample Departures (today's schedule)
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample departures...');

  const departureData = [
    // Dakar → Mbour (multiple departures today)
    { routeName: 'Dakar ↔ Mbour', lineNumber: 'Ligne 1', hours: [6, 7, 8, 9, 10, 12, 14, 16, 18], platforms: ['A1', 'A2', 'A1', 'A2', 'A1', 'A3', 'A1', 'A2', 'A3'] },
    // Dakar → Saint-Louis
    { routeName: 'Dakar ↔ Saint-Louis', lineNumber: 'Ligne 2', hours: [7, 9, 20, 22], platforms: ['B1', 'B1', 'B2', 'B2'] },
    // Dakar → Thiès
    { routeName: 'Dakar ↔ Thiès', lineNumber: 'Ligne 3', hours: [6, 7, 8, 10, 12, 15, 17, 19], platforms: ['C1', 'C2', 'C1', 'C2', 'C1', 'C2', 'C1', 'C2'] },
    // Dakar → Touba
    { routeName: 'Dakar ↔ Touba', lineNumber: 'Ligne 5', hours: [6, 7, 8, 20, 22], platforms: ['D1', 'D2', 'D1', 'D1', 'D2'] },
    // Dakar → Kaolack
    { routeName: 'Dakar ↔ Kaolack', lineNumber: 'Ligne 6', hours: [7, 8, 10, 14, 18], platforms: ['E1', 'E2', 'E1', 'E2', 'E1'] },
    // Dakar → Ziguinchor
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

      await prisma.departure.upsert({
        where: { id: `dep-${routeId}-${dd.hours[i]}` },
        update: {
          originStationId: stationPeters.id,
          destinationStationId: stationMap[routeData.find((r) => r.name === dd.routeName)?.destination || ''] || null,
        },
        create: {
          id: `dep-${routeId}-${dd.hours[i]}`,
          routeId,
          originStationId: stationPeters.id,
          destinationStationId: stationMap[routeData.find((r) => r.name === dd.routeName)?.destination || ''] || null,
          lineNumber: dd.lineNumber,
          destination: routeData.find((r) => r.name === dd.routeName)?.destination || '',
          scheduledTime,
          platform: dd.platforms[i] || '-',
          availableSeats: isPast ? 0 : seats,
          totalSeats: 45,
          status: isPast ? 'DEPARTED' : 'SCHEDULED',
          departureType: 'OUTBOUND',
          agencyId: agency.id,
        },
      });

      // For round-trip routes, create a return departure in the evening
      const routeInfo = routeData.find((r) => r.name === dd.routeName);
      if (routeInfo?.isRoundTrip && dd.hours[i] <= 12) {
        const returnHour = dd.hours[i] + 8 + Math.floor(Math.random() * 3);
        if (returnHour <= 23) {
          const returnTime = new Date(today);
          returnTime.setHours(returnHour, 30, 0, 0);

          const isReturnPast = returnTime.getTime() < now.getTime() - 30 * 60000;
          const destCity = routeInfo.origin;
          const returnOriginStationId = stationMap[routeInfo.destination] || null;

          await prisma.departure.upsert({
            where: { id: `dep-${routeId}-ret-${dd.hours[i]}` },
            update: {
              originStationId: returnOriginStationId,
              destinationStationId: stationMap[destCity] || stationPeters.id,
            },
            create: {
              id: `dep-${routeId}-ret-${dd.hours[i]}`,
              routeId,
              originStationId: returnOriginStationId,
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

  // ═══════════════════════════════════════════════════════════
  // Create sample PassengerTickets
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample passenger tickets...');

  // Find any Mbour outbound departure (even if DEPARTED — for demo purposes)
  const mbourDep = await prisma.departure.findFirst({
    where: {
      routeId: routes['Dakar ↔ Mbour'],
      departureType: 'OUTBOUND',
    },
    orderBy: { scheduledTime: 'asc' },
  });

  if (mbourDep) {
    // Create baggage records for tickets (required relation)
    const ticketBaggage1 = await prisma.baggage.upsert({
      where: { reference: 'TKT-DEMO-001' },
      update: {},
      create: {
        id: 'demo-baggage-1',
        reference: 'TKT-DEMO-001',
        type: 'voyageur',
        category: 'ticket',
        agencyId: agency.id,
        travelerFirstName: 'Mamadou',
        travelerLastName: 'Diallo',
        whatsappOwner: '+221771234567',
        baggageIndex: 1,
        baggageType: 'soute',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        destination: 'Mbour',
      },
    });

    const ticketBaggage2 = await prisma.baggage.upsert({
      where: { reference: 'TKT-DEMO-002' },
      update: {},
      create: {
        id: 'demo-baggage-2',
        reference: 'TKT-DEMO-002',
        type: 'voyageur',
        category: 'ticket',
        agencyId: agency.id,
        travelerFirstName: 'Aminata',
        travelerLastName: 'Fall',
        whatsappOwner: '+221789876543',
        baggageIndex: 1,
        baggageType: 'soute',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        destination: 'Mbour',
      },
    });

    await prisma.passengerTicket.upsert({
      where: { id: 'demo-ticket-1' },
      update: {},
      create: {
        id: 'demo-ticket-1',
        baggageId: ticketBaggage1.id,
        agencyId: agency.id,
        departureId: mbourDep.id,
        passengerName: 'Mamadou Diallo',
        passengerPhone: '771234567',
        destination: 'Mbour',
        seatNumber: '12A',
        departureTime: mbourDep.scheduledTime,
        controlCode: '123456',
        ticketStatus: 'ACTIVE',
        activatedAt: mbourDep.scheduledTime,
        documentType: 'CNI',
        documentNumber: 'SN123456',
        passengerAge: 28,
        luggageCount: 1,
        luggageWeightKg: 12,
        luggageFee: 0,
      },
    });

    await prisma.passengerTicket.upsert({
      where: { id: 'demo-ticket-2' },
      update: {},
      create: {
        id: 'demo-ticket-2',
        baggageId: ticketBaggage2.id,
        agencyId: agency.id,
        departureId: mbourDep.id,
        passengerName: 'Aminata Fall',
        passengerPhone: '789876543',
        destination: 'Mbour',
        seatNumber: '8B',
        departureTime: mbourDep.scheduledTime,
        controlCode: '654321',
        ticketStatus: 'ACTIVE',
        activatedAt: mbourDep.scheduledTime,
        documentType: 'PASSPORT',
        documentNumber: 'PS987654',
        passengerAge: 34,
        luggageCount: 2,
        luggageWeightKg: 22,
        luggageFee: 1400,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Create sample passengers for "missing passenger" feature testing
  // Find a departure ~30 min from now and add 8 tickets (3 validated, 5 missing)
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample passengers for missing-passenger feature...');

  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const upcomingDep = await prisma.departure.findFirst({
    where: {
      agencyId: agency.id,
      scheduledTime: { gte: thirtyMinFromNow },
      departureType: 'OUTBOUND',
    },
    orderBy: { scheduledTime: 'asc' },
  });

  if (upcomingDep) {
    const samplePassengers = [
      { name: 'Fatou Sow', phone: '772345678', seat: '1A', code: '111111', validated: true },
      { name: 'Ibrahima Diop', phone: '783456789', seat: '2A', code: '222222', validated: true },
      { name: 'Aissatou Ba', phone: '764567890', seat: '3A', code: '333333', validated: true },
      { name: 'Omar Ndiaye', phone: '775678901', seat: '4B', code: '444444', validated: false },
      { name: 'Mariama Sy', phone: '786789012', seat: '5B', code: '555555', validated: false },
      { name: 'Moussa Sarr', phone: '777890123', seat: '6B', code: '666666', validated: false },
      { name: 'Khady Diop', phone: '768901234', seat: '7C', code: '777777', validated: false },
      { name: 'Abdoulaye Fall', phone: '789012345', seat: '8C', code: '888888', validated: false },
    ];

    for (const sp of samplePassengers) {
      const ticketId = `ticket-missing-${sp.code}`;
      const baggageId = `baggage-missing-${sp.code}`;

      await prisma.baggage.upsert({
        where: { reference: `TKT-MISS-${sp.code}` },
        update: {},
        create: {
          id: baggageId,
          reference: `TKT-MISS-${sp.code}`,
          type: 'voyageur',
          category: 'ticket',
          agencyId: agency.id,
          travelerFirstName: sp.name.split(' ')[0],
          travelerLastName: sp.name.split(' ').slice(1).join(' '),
          whatsappOwner: `+221${sp.phone}`,
          baggageIndex: 1,
          baggageType: 'soute',
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          destination: upcomingDep.destination,
        },
      });

      await prisma.passengerTicket.upsert({
        where: { id: ticketId },
        update: {},
        create: {
          id: ticketId,
          baggageId,
          agencyId: agency.id,
          departureId: upcomingDep.id,
          passengerName: sp.name,
          passengerPhone: sp.phone,
          destination: upcomingDep.destination,
          seatNumber: sp.seat,
          departureTime: upcomingDep.scheduledTime,
          controlCode: sp.code,
          ticketStatus: sp.validated ? 'USED' : 'ACTIVE',
          validatedAt: sp.validated ? new Date(now.getTime() - 10 * 60 * 1000) : null,
          validatedBy: sp.validated ? 'Contrôleur Auto' : null,
          activatedAt: upcomingDep.scheduledTime,
          documentType: 'CNI',
          documentNumber: `DOC-${sp.code}`,
          passengerAge: 25 + Math.floor(Math.random() * 20),
          luggageCount: 1,
          luggageWeightKg: 10 + Math.floor(Math.random() * 10),
          luggageFee: 0,
        },
      });
    }
    console.log(`  → Added 8 passengers to departure ${upcomingDep.id} (3 scanned, 5 missing)`);
  }

  // ═══════════════════════════════════════════════════════════
  // Create sample in-transit parcels for driver testing
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample in-transit parcels for driver testing...');

  const inTransitParcels = [
    {
      reference: 'COLIS-DKR-MBO-01',
      type: 'voyageur', category: 'parcel', transportMode: 'bus',
      busCompany: 'Ashraf Voyages', departureCity: 'Dakar', destination: 'Mbour',
      departureDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), departureTime: '08:30',
      travelerFirstName: 'Fatou', whatsappOwner: '+221771110001',
      receiverName: 'Ibrahima Sow', receiverWhatsapp: '+221781110001',
      status: 'in_transit', retrievalPin: '384726',
      colisType: 'VALISE', colisWeight: 12.5, colisColor: 'Noir',
      paymentStatus: 'SENDER_PAID', driverPhone: '+221771110000', shareDriverPhone: true,
      estimatedArrival: '10:00', pickupAddress: 'Gare routière de Mbour',
    },
    {
      reference: 'COLIS-DKR-THI-02',
      type: 'voyageur', category: 'parcel', transportMode: 'bus',
      busCompany: 'Ashraf Voyages', departureCity: 'Dakar', destination: 'Thiès',
      departureDate: new Date(now.getTime() + 1 * 60 * 60 * 1000), departureTime: '09:00',
      travelerFirstName: 'Awa', whatsappOwner: '+221772220002',
      receiverName: 'Omar Ba', receiverWhatsapp: '+221782220002',
      status: 'in_transit', retrievalPin: '512938',
      colisType: 'SAC', colisWeight: 5.0, colisColor: 'Bleu',
      paymentStatus: 'RECEIVER_PAY', driverPhone: '+221771110000', shareDriverPhone: true,
      estimatedArrival: '10:15', pickupAddress: 'Station de Thiès',
    },
    {
      reference: 'COLIS-DKR-SLS-03',
      type: 'voyageur', category: 'parcel', transportMode: 'bus',
      busCompany: 'Ashraf Voyages', departureCity: 'Dakar', destination: 'Saint-Louis',
      departureDate: new Date(now.getTime() + 3 * 60 * 60 * 1000), departureTime: '07:00',
      travelerFirstName: 'Cheikh', whatsappOwner: '+221773330003',
      receiverName: 'Ndeye Fatou Diop', receiverWhatsapp: '+221783330003',
      status: 'in_transit', retrievalPin: '741852',
      colisType: 'CARTON', colisWeight: 20.0, colisColor: 'Marron',
      paymentStatus: 'SENDER_PAID', driverPhone: '+221771110000', shareDriverPhone: true,
      estimatedArrival: '11:30', pickupAddress: 'Gare de Saint-Louis',
    },
  ];

  for (const parcel of inTransitParcels) {
    const existing = await prisma.baggage.findUnique({ where: { reference: parcel.reference } });
    if (!existing) {
      await prisma.baggage.create({
        data: {
          ...parcel,
          agencyId: agency.id,
          baggageIndex: 1,
          baggageType: 'soute',
          pinGeneratedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`  ✓ Created in-transit parcel: ${parcel.reference}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Create sample alerts for the Alert Center
  // ═══════════════════════════════════════════════════════════
  console.log('Creating sample alerts for Alert Center...');

  const sampleAlerts = [
    {
      type: 'BUS_PRESQUE_PLEIN',
      severity: 'warning',
      category: 'operations',
      title: 'Bus Mbour rempli à 91%',
      message: 'Le bus vers Mbour (Ligne 1, quai A1) est rempli à 91%. Il ne reste que 4 places disponibles. Envisagez l\'ajout d\'un bus supplémentaire.',
      tripId: 'dep-demo-agency-1-route-Dakar-Mbour-9',
      payload: JSON.stringify({ destination: 'Mbour', lineNumber: 'Ligne 1', platform: 'A1', fillRate: 91, availableSeats: 4, totalSeats: 45 }),
    },
    {
      type: 'RETARD_DETECTE',
      severity: 'critical',
      category: 'operations',
      title: 'Retard de 20 min — Saint-Louis',
      message: 'Le départ vers Saint-Louis (Ligne 2) a un retard de 20 minutes. Heure effective estimée : 09:40 au lieu de 09:20. Les passagers sont informés.',
      tripId: 'dep-demo-agency-1-route-Dakar-Saint-Louis-9',
      payload: JSON.stringify({ destination: 'Saint-Louis', lineNumber: 'Ligne 2', delayMinutes: 20, platform: 'B1' }),
    },
    {
      type: 'COLIS_EN_SOUFFRANCE',
      severity: 'warning',
      category: 'colis',
      title: 'Colis non retiré depuis 72h',
      message: 'Le colis COLIS-DKR-MBO-01 arrivé depuis 72h mais n\'a pas été retiré par le destinataire. Contactez le destinataire pour rappeler le retrait.',
      baggageId: 'sample-baggage-colis-waiting',
      payload: JSON.stringify({ reference: 'COLIS-DKR-MBO-01', destination: 'Mbour', hoursSince: 72 }),
    },
    {
      type: 'RECETTE_ANORMALE',
      severity: 'warning',
      category: 'ventes',
      title: 'Revenus en baisse — 55% de la moyenne',
      message: 'Les revenus du jour sont à 55% de la moyenne mobile sur 4 semaines. Cela représente une baisse significative. Analysez les causes possibles.',
      payload: JSON.stringify({ revenue: 125000, movingAverage: 227000, percentage: 55 }),
    },
    {
      type: 'CLIENT_MECONTENT',
      severity: 'info',
      category: 'clients',
      title: '4 annulations ce mois',
      message: 'Le nombre d\'annulations a atteint le seuil de 3 sur les 30 derniers jours. Vérifiez les causes récurrentes d\'annulation pour améliorer la satisfaction client.',
      payload: JSON.stringify({ cancellationsCount: 4, windowDays: 30, threshold: 3 }),
    },
  ];

  for (const alertData of sampleAlerts) {
    // Check if alert already exists (idempotent)
    const existing = await prisma.alert.findFirst({
      where: {
        agencyId: agency.id,
        type: alertData.type,
        status: 'new',
      },
    });
    if (!existing) {
      await prisma.alert.create({
        data: {
          agencyId: agency.id,
          type: alertData.type,
          severity: alertData.severity,
          category: alertData.category,
          title: alertData.title,
          message: alertData.message,
          tripId: alertData.tripId || null,
          baggageId: alertData.baggageId || null,
          payload: alertData.payload,
          status: 'new',
        },
      });
    }
  }
  console.log(`  → Created ${sampleAlerts.length} sample alerts`);

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📋 Demo credentials:');
  console.log('  SuperAdmin: admin@smartickets.com / admin123');
  console.log('  Agency: agency@smartickets.com / agence123');
  console.log('  Driver: chauffeur@smartickets.com / driver123');
  console.log('');
  console.log('📍 Demo stations:');
  console.log('  station-dakar-peters - Gare Routière Peters (Dakar)');
  console.log('  station-guediawaye - Gare de Guédiawaye (Dakar)');
  console.log('  station-diamniadio - Gare de Diamniadio (Diamniadio)');
  console.log('');
  console.log('📱 Test QR codes:');
  console.log('  VOL25-DEMO01 - Active traveler baggage (no station — global stock)');
  console.log('  COLIS25-DEMO01 - Pending parcel (station: Guédiawaye)');
  console.log('  TKT25-PENDING - Pending ticket (station: Peters)');
  console.log('  TKT-DEMO-001 - Active ticket (Mamadou Diallo, ctrl: 123456)');
  console.log('  TKT-DEMO-002 - Active ticket (Aminata Fall, ctrl: 654321)');
  console.log('');
  console.log('🚛 In-transit parcels (driver testing):');
  console.log('  COLIS-DKR-MBO-01 → Mbour (PIN: 384726)');
  console.log('  COLIS-DKR-THI-02 → Thiès (PIN: 512938)');
  console.log('  COLIS-DKR-SLS-03 → Saint-Louis (PIN: 741852)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
