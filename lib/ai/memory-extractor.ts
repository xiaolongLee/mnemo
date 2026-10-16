import { generateText } from "ai";
import { z } from "zod";
import { MEMORY_DEDUP_THRESHOLD } from "@/lib/constants";
import { chatModel } from "@/lib/ai/provider";
import {
  MEMORY_EXTRACTION_PROMPT,
  MEMORY_WORTHINESS_PROMPT,
} from "@/lib/ai/prompts";
import {
  createMemory,
  findDuplicateMemory,
  updateMemory,
  type MemoryCategory,
} from "@/lib/db/queries/memories";
import { generateEmbedding } from "@/lib/utils/embeddings";

const actionSchema = z.object({
  content: z.string().min(1),
  category: z.enum(["preference", "fact", "behavior"]),
  action: z.enum(["ADD", "UPDATE"]),
  updateTargetId: z.string().optional(),
});

const worthinessSchema = z.object({
  worthy: z.boolean(),
  reason: z.string().max(50),
});

function readJson(text: string, kind: "array" | "object") {
  const match = text.match(kind === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/);
  if (!match) throw new Error("模型没有返回 JSON");
  return JSON.parse(match[0]) as unknown;
}

/**
 * 用 generateText 加正则，而不是 generateObject。
 * 这样换到不支持结构化输出的兼容模型时，提取逻辑仍然能跑。
 */
export async function extractMemories(
  recentMessages: Array<{ role: string; content: string }>,
  existingMemories: Array<{ id: string; category: string; content: string }>,
  userId: string,
  source?: "hot-path" | "background",
) {
  try {
    const existingText =
      existingMemories
        .map((memory) => `- [${memory.id}] (${memory.category}) ${memory.content}`)
        .join("\n") || "（无）";
    const recentText = recentMessages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");
    const result = await generateText({
      model: chatModel,
      prompt: `${MEMORY_EXTRACTION_PROMPT.replace("{existingMemories}", existingText).replace("{recentMessages}", recentText)}

只输出 JSON 数组，不要 Markdown，不要解释。每一项格式：
{"content":"...","category":"preference|fact|behavior","action":"ADD|UPDATE","updateTargetId":"可选"}`,
    });
    const parsed = actionSchema.array().parse(readJson(result.text, "array"));
    console.log(`[memory] ${source ?? "manual"} extracted ${parsed.length}`);

    for (const item of parsed) {
      try {
        const embedding = await generateEmbedding(item.content);
        if (item.action === "UPDATE" && item.updateTargetId) {
          await updateMemory(item.updateTargetId, {
            content: item.content,
            category: item.category,
            embedding,
          });
          continue;
        }
        const duplicate = await findDuplicateMemory(
          userId,
          embedding,
          MEMORY_DEDUP_THRESHOLD,
        );
        if (duplicate) {
          await updateMemory(duplicate.id, {
            content: item.content,
            category: item.category,
            embedding,
          });
          continue;
        }
        await createMemory({
          userId,
          content: item.content,
          category: item.category satisfies MemoryCategory,
          embedding,
        });
      } catch (error) {
        console.error("memory item failed", error);
      }
    }
  } catch (error) {
    console.error("extractMemories failed", error);
  }
}

/**
 * 判断失败就当不值得记。宁可漏一条，也不能让这条检查拖垮聊天。
 */
export async function shouldExtractMemory(userMessage: string) {
  try {
    const result = await generateText({
      model: chatModel,
      prompt: `${MEMORY_WORTHINESS_PROMPT.replace("{userMessage}", userMessage)}

只输出 JSON：{"worthy":true,"reason":"不超过50字"}`,
    });
    return worthinessSchema.parse(readJson(result.text, "object"));
  } catch (error) {
    console.error("shouldExtractMemory failed", error);
    return { worthy: false, reason: "" };
  }
}
