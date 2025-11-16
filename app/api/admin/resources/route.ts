import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { resources, embeddings } from "@/lib/db/schema";
import { createResource } from "@/lib/actions/resources";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    const allResources = await db
      .select({
        id: resources.id,
        content: resources.content,
        createdAt: resources.createdAt,
        updatedAt: resources.updatedAt,
      })
      .from(resources)
      .orderBy(desc(resources.createdAt));

    // Get embedding count for each resource
    const resourcesWithEmbeddings = await Promise.all(
      allResources.map(async (resource) => {
        const embeddingCount = await db
          .select()
          .from(embeddings)
          .where(eq(embeddings.resourceId, resource.id));

        return {
          ...resource,
          embeddingCount: embeddingCount.length,
        };
      })
    );

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
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const resource = await createResource({ content });

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
