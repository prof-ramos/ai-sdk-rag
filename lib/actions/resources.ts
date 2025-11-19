"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { generateEmbeddings } from "../ai/embedding";
import { db } from "../db";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";

export const createResource = async (input: NewResourceParams) => {
  try {
    const validatedInput = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({
        content: validatedInput.content,
        title: validatedInput.title,
        documentType: validatedInput.documentType,
        sourceUrl: validatedInput.sourceUrl,
      })
      .returning();

    const embeddings = await generateEmbeddings(validatedInput.content);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      })),
    );
    return "Resource successfully created and embedded.";
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error("Error creating resource:", error);

    // Return generic message to client to avoid leaking sensitive information
    return "Erro ao criar recurso. Por favor, tente novamente.";
  }
};
