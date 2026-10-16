import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";

type MessageRole = "user" | "assistant" | "system";

export async function createMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount: number;
}) {
  const [row] = await db.insert(messages).values(input).returning();
  return row;
}

export async function listMessagesByConversation(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function countMessagesByConversation(conversationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return row?.value ?? 0;
}
