import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";

// GET /api/superadmin/platform-settings — List all platform settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN");

    const settings = await db.platformSettings.findMany({
      orderBy: { key: "asc" },
    });

    // Convert to key-value map
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ settings, settingsMap });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PUT /api/superadmin/platform-settings — Update platform settings (bulk)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN");

    const body = await request.json();
    const { settings } = body as {
      settings: Array<{
        key: string;
        value: string;
        description?: string;
        type?: string;
      }>;
    };

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Settings must be an array" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      settings.map((s) =>
        db.platformSettings.upsert({
          where: { key: s.key },
          create: {
            key: s.key,
            value: s.value,
            description: s.description,
            type: s.type || "string",
          },
          update: {
            value: s.value,
            description: s.description,
            ...(s.type ? { type: s.type } : {}),
          },
        })
      )
    );

    // Audit log
    await db.auditLog.create({
      data: {
        action: "UPDATE_PLATFORM_SETTINGS",
        entity: "PlatformSettings",
        userId: user.userId,
        details: JSON.stringify({
          updatedKeys: settings.map((s) => s.key),
        }),
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
