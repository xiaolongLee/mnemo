import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema";

export type MemoryCategory = "preference" | "fact" | "behavior";

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

export async function createMemory(data: {
  userId: string;
  content: string;
  category: MemoryCategory;
  embedding: number[];
  importanceScore?: number;
}) {
  const [row] = await db.insert(memories).values(data).returning();
  return row;
}

export async function updateMemory(
  id: string,
  data: {
    content?: string;
    category?: MemoryCategory;
    embedding?: number[];
    importanceScore?: number;
  },
) {
  const [row] = await db
    .update(memories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();
  return row;
}

export async function deleteMemory(id: string) {
  await db.delete(memories).where(eq(memories.id, id));
}

export async function listMemoriesByUser(userId: string) {
  return db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt));
}

type MemoryHit = {
  id: string;
  content: string;
  category: MemoryCategory;
  similarity: number;
};

export async function searchMemoriesBySimilarity(
  userId: string,
  queryEmbedding: number[],
  limit: number,
  threshold: number,
) {
  const literal = toVectorLiteral(queryEmbedding);
  const result = await db.execute(sql`
    SELECT id, content, category,
           1 - (embedding <=> ${literal}::vector) AS similarity
    FROM memories
    WHERE user_id = ${userId}
      AND 1 - (embedding <=> ${literal}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);
  return asRows<{
    id: string;
    content: string;
    category: MemoryCategory;
    similarity: string | number;
  }>(result).map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  })) satisfies MemoryHit[];
}

export async function findDuplicateMemory(
  userId: string,
  embedding: number[],
  threshold: number,
) {
  const [row] = await searchMemoriesBySimilarity(userId, embedding, 1, threshold);
  return row ?? null;
}

export async function incrementAccessCount(id: string) {
  await db
    .update(memories)
    .set({
      accessCount: sql`${memories.accessCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(memories.id, id));
}
