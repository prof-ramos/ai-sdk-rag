import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  runComprehensiveEvaluation,
  generateEvaluationReport,
  analyzeRetrievalFromLogs,
} from "@/lib/ai/rag-evaluation";

/**
 * GET /api/admin/metrics/rag
 * Get RAG performance metrics and evaluation
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary"; // summary, full, report, logs

    switch (type) {
      case "full":
        const fullEval = await runComprehensiveEvaluation();
        return NextResponse.json({
          type: "full",
          evaluation: fullEval,
        });

      case "report":
        const report = await generateEvaluationReport();
        return NextResponse.json({
          type: "report",
          report,
        });

      case "logs":
        const sampleSize = parseInt(searchParams.get("sampleSize") || "100");
        const logAnalysis = await analyzeRetrievalFromLogs(sampleSize);
        return NextResponse.json({
          type: "logs",
          analysis: logAnalysis,
        });

      case "summary":
      default:
        // Quick summary - just log analysis
        const summary = await analyzeRetrievalFromLogs(50);
        return NextResponse.json({
          type: "summary",
          summary,
        });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("RAG metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
