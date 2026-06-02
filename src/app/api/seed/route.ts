import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifyToken } from "@/lib/auth";
import { hashPin, extendPinExpiry } from "@/lib/pin";
import crypto from "crypto";

interface SeedResult {
  superAdmin: { email: string; created: boolean };
  tenants: Array<{
    name: string;
    slug: string;
    created: boolean;
    users: Array<{ email: string; role: string; created: boolean }>;
    stations: Array<{ name: string; code: string; city: string; created: boolean }>;
    lines: Array<{ name: string; created: boolean }>;
    parcelRates: Array<{ from: string; to: string; price: number; created: boolean }>;
    parcels: Array<{ controlCode: string; sender: string; created: boolean }>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // ─── SECURITY: Protect seed endpoint ───
    // In production: completely disabled
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seed endpoint is disabled in production" },
        { status: 403 }
      );
    }

    // In non-production: require SUPER_ADMIN authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    try {
      const decoded = await verifyToken(authHeader.slice(7));
      if (decoded.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Access restricted to SUPER_ADMIN only" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const results: SeedResult = {
      superAdmin: { email: "admin@smarttickets.com", created: false },
      tenants: [],
    };

    // ==========================================
    // 1. Create SUPER_ADMIN (upsert)
    // ==========================================
    const superAdminEmail = "admin@smarttickets.com";
    const superAdminPassword = await hashPassword("Admin@1234");

    const existingSuperAdmin = await db.user.findFirst({
      where: { email: superAdminEmail, tenantId: null },
    });

    let superAdmin;
    if (existingSuperAdmin) {
      superAdmin = await db.user.update({
        where: { id: existingSuperAdmin.id },
        data: {
          password: superAdminPassword,
          firstName: "Super",
          lastName: "Admin",
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
    } else {
      superAdmin = await db.user.create({
        data: {
          email: superAdminEmail,
          password: superAdminPassword,
          firstName: "Super",
          lastName: "Admin",
          role: "SUPER_ADMIN",
          isActive: true,
        },
      });
    }

    results.superAdmin.created = superAdmin.createdAt === superAdmin.updatedAt;

    // ==========================================
    // 2. Create Demo Tenants & Users
    // ==========================================
    const demoTenants = [
      {
        name: "STMB Transport",
        slug: "stmb",
        email: "contact@stmb.com",
        phone: "+221 77 123 45 67",
        address: "1 Rue Mohammed V, Dakar",
        plan: "pro" as const,
        maxUsers: 20,
        maxStations: 10,
        users: [
          {
            email: "admin@stmb.com",
            password: "Admin@1234",
            firstName: "STMB",
            lastName: "Admin",
            role: "ADMIN" as const,
          },
          {
            email: "operator@stmb.com",
            password: "Oper@1234",
            firstName: "STMB",
            lastName: "Operator",
            role: "OPERATOR" as const,
          },
          {
            email: "chauffeur@stmb.com",
            password: "Drive@1234",
            firstName: "STMB",
            lastName: "Chauffeur",
            role: "DRIVER" as const,
            phone: "771234567",
          },
          {
            email: "controlleur@stmb.com",
            password: "Ctrl@1234",
            firstName: "STMB",
            lastName: "Controlleur",
            role: "CONTROLLER" as const,
          },
        ],
        stations: [
          { name: "Gare Dakar", code: "DKR", city: "Dakar", address: "Place de l'Indépendance" },
          { name: "Gare Thiès", code: "THI", city: "Thiès", address: "Avenue Lamine Guèye" },
          { name: "Gare Saint-Louis", code: "STL", city: "Saint-Louis", address: "Boulevard de la République" },
          { name: "Gare Kaolack", code: "KLC", city: "Kaolack", address: "Route Nationale 1" },
        ],
        lines: [
          { name: "Dakar - Thiès", code: "DK-TH", fromIdx: 0, toIdx: 1, distance: 70, duration: 90, basePrice: 5000 },
          { name: "Dakar - Saint-Louis", code: "DK-SL", fromIdx: 0, toIdx: 2, distance: 260, duration: 300, basePrice: 15000 },
          { name: "Thiès - Kaolack", code: "TH-KL", fromIdx: 1, toIdx: 3, distance: 120, duration: 150, basePrice: 8000 },
        ],
      },
      {
        name: "Express Voyage",
        slug: "express-voyage",
        email: "contact@expressvoyage.com",
        phone: "+221 78 987 65 43",
        address: "10 Avenue Hassan II, Dakar",
        plan: "starter" as const,
        maxUsers: 10,
        maxStations: 5,
        users: [
          {
            email: "admin@express-voyage.com",
            password: "Admin@1234",
            firstName: "Express",
            lastName: "Admin",
            role: "ADMIN" as const,
          },
          {
            email: "operator@express-voyage.com",
            password: "Oper@1234",
            firstName: "Express",
            lastName: "Operator",
            role: "OPERATOR" as const,
          },
          {
            email: "chauffeur@express-voyage.com",
            password: "Drive@1234",
            firstName: "Express",
            lastName: "Chauffeur",
            role: "DRIVER" as const,
            phone: "789876543",
          },
        ],
        stations: [
          { name: "Gare Mbao", code: "MBA", city: "Dakar", address: "Carrefour de Mbao" },
          { name: "Gare Rufisque", code: "RUF", city: "Rufisque", address: "Centre-ville" },
          { name: "Gare Mbour", code: "MBR", city: "Mbour", address: "Avenue de la République" },
        ],
        lines: [
          { name: "Mbao - Mbour", code: "MB-MB", fromIdx: 0, toIdx: 2, distance: 50, duration: 60, basePrice: 3000 },
          { name: "Rufisque - Mbour", code: "RF-MB", fromIdx: 1, toIdx: 2, distance: 35, duration: 45, basePrice: 2500 },
        ],
      },
    ];

    for (const tenantData of demoTenants) {
      const tenantResult: SeedResult["tenants"][0] = {
        name: tenantData.name,
        slug: tenantData.slug,
        created: false,
        users: [],
        stations: [],
        lines: [],
        parcelRates: [],
        parcels: [],
      };

      // Upsert tenant
      const tenant = await db.tenant.upsert({
        where: { slug: tenantData.slug },
        create: {
          name: tenantData.name,
          slug: tenantData.slug,
          email: tenantData.email,
          phone: tenantData.phone,
          address: tenantData.address,
          plan: tenantData.plan,
          maxUsers: tenantData.maxUsers,
          maxStations: tenantData.maxStations,
          isActive: true,
          allowSelfTicketGeneration: true,
          allowSelfParcelGeneration: true,
        },
        update: {
          name: tenantData.name,
          email: tenantData.email,
          phone: tenantData.phone,
          address: tenantData.address,
          plan: tenantData.plan,
          maxUsers: tenantData.maxUsers,
          maxStations: tenantData.maxStations,
          isActive: true,
          allowSelfTicketGeneration: true,
          allowSelfParcelGeneration: true,
        },
      });

      tenantResult.created = tenant.createdAt === tenant.updatedAt;

      // Create users for this tenant
      // Seed PIN for terrain staff (DRIVER/CONTROLLER) — default "1234"
      const SEED_PIN = "1234";
      const hashedSeedPin = await hashPin(SEED_PIN);
      const seedPinExpiry = extendPinExpiry();

      for (const userData of tenantData.users) {
        const hashedPwd = await hashPassword(userData.password);
        const isTerrainRole = userData.role === "DRIVER" || userData.role === "CONTROLLER";
        const userPhone = "phone" in userData ? (userData as Record<string, unknown>).phone as string : undefined;

        const user = await db.user.upsert({
          where: {
            email_tenantId: { email: userData.email, tenantId: tenant.id },
          },
          create: {
            email: userData.email,
            password: hashedPwd,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userPhone,
            role: userData.role,
            tenantId: tenant.id,
            isActive: true,
            ...(isTerrainRole ? { pinHash: hashedSeedPin, pinExpiresAt: seedPinExpiry } : {}),
          },
          update: {
            password: hashedPwd,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userPhone,
            role: userData.role,
            isActive: true,
            ...(isTerrainRole ? { pinHash: hashedSeedPin, pinExpiresAt: seedPinExpiry } : {}),
          },
        });

        tenantResult.users.push({
          email: userData.email,
          role: userData.role,
          created: user.createdAt === user.updatedAt,
        });
      }

      // ==========================================
      // 3. Create Stations
      // ==========================================
      const createdStations: string[] = [];
      for (const stationData of tenantData.stations) {
        const existing = await db.station.findFirst({
          where: {
            name: stationData.name,
            city: stationData.city,
            tenantId: tenant.id,
          },
        });

        let station;
        if (existing) {
          station = existing;
        } else {
          station = await db.station.create({
            data: {
              name: stationData.name,
              code: stationData.code,
              city: stationData.city,
              address: stationData.address,
              isActive: true,
              tenantId: tenant.id,
            },
          });
        }

        createdStations.push(station.id);
        tenantResult.stations.push({
          name: stationData.name,
          code: stationData.code,
          city: stationData.city,
          created: station.createdAt === station.updatedAt,
        });
      }

      // ==========================================
      // 4. Create Lines
      // ==========================================
      for (const lineData of tenantData.lines) {
        const fromStationId = createdStations[lineData.fromIdx];
        const toStationId = createdStations[lineData.toIdx];

        if (!fromStationId || !toStationId) continue;

        const existing = await db.line.findFirst({
          where: {
            code: lineData.code,
            tenantId: tenant.id,
          },
        });

        let line;
        if (existing) {
          line = existing;
        } else {
          line = await db.line.create({
            data: {
              name: lineData.name,
              code: lineData.code,
              fromStationId,
              toStationId,
              distance: lineData.distance,
              duration: lineData.duration,
              basePrice: lineData.basePrice,
              isActive: true,
              tenantId: tenant.id,
            },
          });
        }

        tenantResult.lines.push({
          name: lineData.name,
          created: line.createdAt === line.updatedAt,
        });
      }

      // ==========================================
      // 5. Create Parcel Rates
      // ==========================================
      const rateCombinations: Array<{ fromIdx: number; toIdx: number; price: number }> = [];
      for (const lineData of tenantData.lines) {
        rateCombinations.push({
          fromIdx: lineData.fromIdx,
          toIdx: lineData.toIdx,
          price: Math.round(lineData.basePrice * 0.3),
        });
        rateCombinations.push({
          fromIdx: lineData.toIdx,
          toIdx: lineData.fromIdx,
          price: Math.round(lineData.basePrice * 0.3),
        });
      }

      const seenRates = new Set<string>();
      for (const rateData of rateCombinations) {
        const key = `${rateData.fromIdx}-${rateData.toIdx}`;
        if (seenRates.has(key)) continue;
        seenRates.add(key);

        const fromStationId = createdStations[rateData.fromIdx];
        const toStationId = createdStations[rateData.toIdx];
        if (!fromStationId || !toStationId) continue;

        const existing = await db.parcelRate.findUnique({
          where: {
            fromStationId_toStationId_tenantId: {
              fromStationId,
              toStationId,
              tenantId: tenant.id,
            },
          },
        });

        if (!existing) {
          await db.parcelRate.create({
            data: {
              fromStationId,
              toStationId,
              price: rateData.price,
              isActive: true,
              tenantId: tenant.id,
            },
          });
        }

        const fromStation = tenantData.stations[rateData.fromIdx];
        const toStation = tenantData.stations[rateData.toIdx];
        tenantResult.parcelRates.push({
          from: fromStation.name,
          to: toStation.name,
          price: rateData.price,
          created: true,
        });
      }

      // ==========================================
      // 6. Generate Preprinted Tickets (PARCEL type)
      // ==========================================
      const slugPrefix = tenantData.slug.substring(0, 3).toUpperCase();
      const existingParcelTickets = await db.preprintedTicket.count({
        where: { tenantId: tenant.id, type: "PARCEL" },
      });

      if (existingParcelTickets === 0) {
        const batchId = crypto.randomUUID();
        const parcelTicketCount = 20;

        for (let i = 1; i <= parcelTicketCount; i++) {
          await db.preprintedTicket.create({
            data: {
              ticketCode: `CPS-${slugPrefix}-${i.toString().padStart(4, "0")}`,
              qrHash: crypto.randomUUID(),
              type: "PARCEL",
              status: "inactive",
              batchId,
              tenantId: tenant.id,
            },
          });
        }
      }

      // ==========================================
      // 7. Generate Preprinted Tickets (TICKET type)
      // ==========================================
      const existingRegularTickets = await db.preprintedTicket.count({
        where: { tenantId: tenant.id, type: "TICKET" },
      });

      if (existingRegularTickets === 0) {
        const batchId = crypto.randomUUID();
        const ticketCount = 30;

        for (let i = 1; i <= ticketCount; i++) {
          await db.preprintedTicket.create({
            data: {
              ticketCode: `TKT-${slugPrefix}-${i.toString().padStart(4, "0")}`,
              qrHash: crypto.randomUUID(),
              type: "TICKET",
              status: "inactive",
              batchId,
              tenantId: tenant.id,
            },
          });
        }
      }

      // ==========================================
      // 8. Create Departures for Signage
      // ==========================================
      const createdLines: string[] = [];
      for (const lineData of tenantData.lines) {
        const fromStationId = createdStations[lineData.fromIdx];
        const toStationId = createdStations[lineData.toIdx];
        if (!fromStationId || !toStationId) continue;
        const existingLine = await db.line.findFirst({
          where: { code: lineData.code, tenantId: tenant.id },
        });
        if (existingLine) createdLines.push(existingLine.id);
      }

      const existingDepartures = await db.departure.count({
        where: { tenantId: tenant.id },
      });

      if (existingDepartures === 0) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const departureTemplates = [
          { lineIdx: 0, stationIdx: 0, hours: [6, 8, 10, 12, 14, 16, 18] },
          { lineIdx: 1, stationIdx: 0, hours: [7, 9, 11, 15, 17] },
          { lineIdx: 2, stationIdx: 1, hours: [6, 9, 12, 15] },
        ];

        for (const tmpl of departureTemplates) {
          const lineId = createdLines[tmpl.lineIdx];
          const stationId = createdStations[tmpl.stationIdx];
          if (!lineId || !stationId) continue;

          for (let i = 0; i < tmpl.hours.length; i++) {
            const depTime = new Date(today);
            depTime.setHours(tmpl.hours[i], 0, 0, 0);
            if (depTime <= now) {
              depTime.setDate(depTime.getDate() + 1);
            }

            await db.departure.create({
              data: {
                lineId,
                stationId,
                scheduledTime: depTime,
                date: today,
                platform: `Q${(i % 4) + 1}`,
                status: "SCHEDULED",
                delayMinutes: 0,
                availableSeats: 40,
                totalSeats: 40,
                tenantId: tenant.id,
              },
            });
          }
        }
      }

      // ==========================================
      // 9. Create Signage Messages
      // ==========================================
      const existingMessages = await db.signageMessage.count({
        where: { tenantId: tenant.id },
      });

      if (existingMessages === 0) {
        const now = new Date();
        const messagesData = [
          {
            content: "Bienvenue à bord des lignes SmartTicketQR — Voyagez en toute sécurité !",
            priority: "INFO" as const,
            stationId: null,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: null,
          },
          {
            content: "Nouveau : Service de messagerie de colis disponible à tous les guichets. Informez-vous !",
            priority: "NORMAL" as const,
            stationId: null,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: null,
          },
          {
            content: "ATTENTION : Contrôle renforcé des billets ce week-end. Gardez votre billet sur vous.",
            priority: "URGENT" as const,
            stationId: null,
            startDate: now,
            endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        ];

        for (const msg of messagesData) {
          await db.signageMessage.create({
            data: {
              content: msg.content,
              priority: msg.priority,
              startDate: msg.startDate,
              endDate: msg.endDate,
              isActive: true,
              stationId: msg.stationId,
              tenantId: tenant.id,
            },
          });
        }
      }

      results.tenants.push(tenantResult);
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
