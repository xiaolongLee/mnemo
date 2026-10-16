import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";

export async function createConversation(userId: string) {
  const [row] = await db
    .insert(conversations)
    .values({ userId })
    .returning();
  return row;
}

export async function listConversations(userId: string) {
  return db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.userId, userId), eq(conversations.isDeleted, false)),
    )
    .orderBy(desc(conversations.updatedAt));
}

export async function softDeleteConversation(id: string) {
  await db
    .update(conversations)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function touchConversation(id: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function updateConversationTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}
