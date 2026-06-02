import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refreshAccessToken } from "@/lib/auth";

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Token rotation: old refresh token is revoked, new pair is issued
    const { accessToken, refreshToken: newRefreshToken } =
      await refreshAccessToken(parsed.data.refreshToken);

    return NextResponse.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token refresh failed";
    const status =
      message.includes("révoqué") || message.includes("Invalid") || message.includes("expired")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
