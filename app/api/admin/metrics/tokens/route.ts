import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getUserTokenStats,
  getSystemTokenStats,
  getTopUsersByTokens,
  getDailyCostBreakdown,
} from "@/lib/ai/token-tracker";

/**
 * GET /api/admin/metrics/tokens
 * Get token usage and cost metrics
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "system"; // system, user, top-users, daily
    const userId = searchParams.get("userId");
    const days = parseInt(searchParams.get("days") || "30");

    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let data;

    switch (type) {
      case "user":
        if (!userId) {
          return NextResponse.json(
            { error: "userId required for user metrics" },
            { status: 400 }
          );
        }
        data = await getUserTokenStats(userId, dateFrom);
        break;

      case "top-users":
        const limit = parseInt(searchParams.get("limit") || "10");
        data = await getTopUsersByTokens(limit, dateFrom);
        break;

      case "daily":
        data = await getDailyCostBreakdown(days);
        break;

      case "system":
      default:
        data = await getSystemTokenStats(dateFrom);
        break;
    }

    return NextResponse.json({
      type,
      period: `${days} days`,
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Token metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
