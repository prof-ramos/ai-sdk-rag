import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { resources, embeddings } from "@/lib/db/schema";
import { createResource } from "@/lib/actions/resources";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    // OPTIMIZED: Use a single query with GROUP BY instead of N+1 queries
    // This replaces the previous N+1 query pattern where we fetched each resource
    // and then made a separate query for each resource's embedding count
    const resourcesWithEmbeddings = await db
      .select({
        id: resources.id,
        content: resources.content,
        title: resources.title,
        documentType: resources.documentType,
        sourceUrl: resources.sourceUrl,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
        embeddingCount: sql<number>`count(${embeddings.id})::int`,
      })
      .from(resources)
      .leftJoin(embeddings, eq(embeddings.resourceId, resources.id))
      .groupBy(
        resources.id,
        resources.content,
        resources.title,
        resources.documentType,
        resources.sourceUrl,
        resources.createdAt,
        resources.updatedAt
      )
      .orderBy(desc(resources.createdAt));

    return NextResponse.json({ resources: resourcesWithEmbeddings });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get resources error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { content, title, documentType, sourceUrl } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const resource = await createResource({
      content,
      title,
      documentType,
      sourceUrl,
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
