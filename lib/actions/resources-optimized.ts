"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { generateEmbeddings } from "../ai/embedding-optimized";
import { db } from "../db";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";

/**
 * Optimized resource creation with enhanced metadata
 */
export const createResource = async (input: NewResourceParams) => {
  try {
    const validatedInput = insertResourceSchema.parse(input);

    // Create resource
    const [resource] = await db
      .insert(resources)
      .values({
        content: validatedInput.content,
        title: validatedInput.title,
        documentType: validatedInput.documentType,
        sourceUrl: validatedInput.sourceUrl,
      })
      .returning();

    // Generate embeddings with metadata
    const embeddingsData = await generateEmbeddings(validatedInput.content, {
      title: validatedInput.title,
      documentType: validatedInput.documentType,
      sourceUrl: validatedInput.sourceUrl,
    });

    // Insert embeddings
    await db.insert(embeddingsTable).values(
      embeddingsData.map((embedding) => ({
        resourceId: resource.id,
        content: embedding.content,
        embedding: embedding.embedding,
      })),
    );

    return {
      success: true,
      message: "Resource successfully created and embedded.",
      resourceId: resource.id,
      embeddingCount: embeddingsData.length,
    };
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error("Error creating resource:", error);

    // Return generic message to client to avoid leaking sensitive information
    return {
      success: false,
      message: "Erro ao criar recurso. Por favor, tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Batch create resources for better performance
 */
export const createResourcesBatch = async (
  inputs: NewResourceParams[]
): Promise<{
  success: boolean;
  message: string;
  created: number;
  failed: number;
  errors: string[];
}> => {
  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const input of inputs) {
    try {
      const result = await createResource(input);
      if (result.success) {
        created++;
      } else {
        failed++;
        errors.push(`Failed to create resource: ${input.title || 'untitled'}`);
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error with resource ${input.title || 'untitled'}: ${errorMsg}`);
    }
  }

  return {
    success: created > 0,
    message: `Created ${created} resources, ${failed} failed`,
    created,
    failed,
    errors,
  };
};
