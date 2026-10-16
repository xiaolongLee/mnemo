import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentChunks, documents } from "@/lib/db/schema";

type DocumentStatus = "processing" | "ready" | "error";

function toVectorLiteral(embedding: number[]) {
  if (!embedding.every((value) => Number.isFinite(value))) {
    throw new Error("向量包含非法数字");
  }
  return `[${embedding.join(",")}]`;
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function createDocument(input: { userId: string; filename: string }) {
  const [row] = await db.insert(documents).values(input).returning();
  return row;
}

export async function listDocumentsByUser(userId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function deleteDocument(id: string) {
  await db.delete(documents).where(eq(documents.id, id));
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  totalChunks?: number,
) {
  await db
    .update(documents)
    .set({
      status,
      ...(typeof totalChunks === "number" ? { totalChunks } : {}),
    })
    .where(eq(documents.id, id));
}

export async function batchCreateChunks(
  chunks: Array<{
    documentId: string;
    content: string;
    chunkIndex: number;
    embedding: number[];
    tokenCount: number;
  }>,
) {
  if (chunks.length === 0) return;
  await db.insert(documentChunks).values(chunks);
}

export async function searchChunksBySimilarity(
  userId: string,
  queryEmbedding: number[],
  limit: number,
  threshold: number,
) {
  const literal = toVectorLiteral(queryEmbedding);
  const result = await db.execute(sql`
    SELECT dc.content, d.filename,
           1 - (dc.embedding <=> ${literal}::vector) AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.user_id = ${userId}
      AND d.status = 'ready'
      AND 1 - (dc.embedding <=> ${literal}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);
  return asRows<{
    content: string;
    filename: string;
    similarity: string | number;
  }>(result).map((row) => ({
    content: row.content,
    filename: row.filename,
    similarity: Number(row.similarity),
  }));
}
