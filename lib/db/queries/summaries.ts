import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { summaries } from "@/lib/db/schema";

export async function getLatestSummary(conversationId: string) {
  const [row] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.conversationId, conversationId))
    .orderBy(desc(summaries.createdAt))
    .limit(1);
  return row ?? null;
}

export async function createSummary(input: {
  conversationId: string;
  content: string;
  coveredMessageCount: number;
  tokenCount: number;
}) {
  const [row] = await db.insert(summaries).values(input).returning();
  return row;
}
