import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";

// GET /api/admin/reports/export — Export report as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    requireRole(user, "SUPER_ADMIN", "ADMIN");

    const tenantId = user.tenantId;
    if (!tenantId && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const targetTenantId =
      user.role === "SUPER_ADMIN"
        ? searchParams.get("tenantId") || tenantId
        : tenantId;

    if (!targetTenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const { generateTenantReport, exportTenantReportCSV } = await import(
      "@/lib/reports"
    );
    const filters = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };
    const report = await generateTenantReport(targetTenantId, filters);
    const csv = exportTenantReportCSV(report);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rapport_${targetTenantId}_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permissions") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
