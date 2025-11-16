import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllChatLogs } from "@/lib/actions/chat-logs";

export async function GET() {
  try {
    await requireAdmin();

    const logs = await getAllChatLogs();

    // Convert to CSV
    const headers = ["ID", "User ID", "Question", "Answer", "Model", "Created At"];
    const rows = logs.map((log) => [
      log.id,
      log.userId || "anonymous",
      `"${log.question.replace(/"/g, '""')}"`,
      `"${log.answer.replace(/"/g, '""')}"`,
      log.model || "unknown",
      log.createdAt?.toISOString() || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="chat-logs-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
