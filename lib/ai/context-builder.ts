import type { ModelMessage } from "ai";
import {
  DEFAULT_USER_ID,
  MEMORY_BUDGET,
  MEMORY_SIMILARITY_THRESHOLD,
  MEMORY_TOP_K,
  RAG_BUDGET,
  RAG_SIMILARITY_THRESHOLD,
  RAG_TOP_K,
  RECENT_MESSAGES_TO_KEEP,
  SLIDING_WINDOW_SIZE,
  TOTAL_TOKEN_BUDGET,
} from "@/lib/constants";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { listMessagesByConversation } from "@/lib/db/queries/messages";
import {
  incrementAccessCount,
  searchMemoriesBySimilarity,
} from "@/lib/db/queries/memories";
import { searchChunksBySimilarity } from "@/lib/db/queries/documents";
import { getLatestSummary } from "@/lib/db/queries/summaries";
import { generateEmbedding } from "@/lib/utils/embeddings";
import { estimateTokens } from "@/lib/utils/tokens";

export type RetrievedMemory = {
  id: string;
  content: string;
  category: string;
  similarity: number;
};

export type RetrievedChunk = {
  content: string;
  filename: string;
  similarity: number;
};

export type ContextDebugInfo = {
  totalTokens: number;
  historyTokens: number;
  systemPromptTokens: number;
  summaryTokens: number;
  memoryTokens: number;
  ragTokens: number;
};

type HistoryRow = { role: "user" | "assistant" | "system"; content: string; tokenCount: number };

function fitBlocks(header: string, blocks: string[], budget: number, joiner: string) {
  const kept: string[] = [];
  for (const block of blocks) {
    const candidate = `${header}${kept.concat(block).join(joiner)}`;
    if (estimateTokens(candidate) > budget) break;
    kept.push(block);
  }
  if (kept.length === 0) return { text: "", tokens: 0, count: 0 };
  const text = `${header}${kept.join(joiner)}`;
  return { text, tokens: estimateTokens(text), count: kept.length };
}

function takeLatestWithinBudget(rows: HistoryRow[], budget: number) {
  const selected: HistoryRow[] = [];
  let used = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const tokens = row.tokenCount || estimateTokens(row.content);
    if (used + tokens > budget) break;
    selected.push(row);
    used += tokens;
  }
  selected.reverse();
  return { selected, used };
}

export async function buildConversationContext(
  conversationId: string,
  currentUserMessage?: string,
) {
  const systemPromptTokens = estimateTokens(SYSTEM_PROMPT);
  try {
    const [history, summary] = await Promise.all([
      listMessagesByConversation(conversationId),
      getLatestSummary(conversationId),
    ]);

    let retrievedMemories: RetrievedMemory[] = [];
    let ragChunks: RetrievedChunk[] = [];
    let memoryTokens = 0;
    let ragTokens = 0;
    let memoryText = "";
    let ragText = "";

    if (currentUserMessage) {
      try {
        const embedding = await generateEmbedding(currentUserMessage);
        const [memories, chunks] = await Promise.all([
          searchMemoriesBySimilarity(
            DEFAULT_USER_ID,
            embedding,
            MEMORY_TOP_K,
            MEMORY_SIMILARITY_THRESHOLD,
          ),
          searchChunksBySimilarity(
            DEFAULT_USER_ID,
            embedding,
            RAG_TOP_K,
            RAG_SIMILARITY_THRESHOLD,
          ),
        ]);

        const memoryFit = fitBlocks(
          "## 关于当前用户\n",
          memories.map((memory) => `- ${memory.content}`),
          MEMORY_BUDGET,
          "\n",
        );
        memoryText = memoryFit.text;
        memoryTokens = memoryFit.tokens;
        retrievedMemories = memories.slice(0, memoryFit.count).map((memory) => ({
          id: memory.id,
          content: memory.content,
          category: memory.category,
          similarity: memory.similarity,
        }));
        for (const memory of retrievedMemories) {
          incrementAccessCount(memory.id).catch(() => {});
        }

        const ragFit = fitBlocks(
          "## 参考知识\n",
          chunks.map((chunk) => `[来源: ${chunk.filename}]\n${chunk.content}`),
          RAG_BUDGET,
          "\n\n",
        );
        ragText = ragFit.text;
        ragTokens = ragFit.tokens;
        ragChunks = chunks.slice(0, ragFit.count);
      } catch (error) {
        console.error("retrieval failed", error);
      }
    }

    const summaryText = summary
      ? `以下是之前对话的摘要：\n${summary.content}`
      : "";
    const summaryTokens = summaryText ? estimateTokens(summaryText) : 0;
    const historyBudget = Math.max(
      0,
      TOTAL_TOKEN_BUDGET - systemPromptTokens - summaryTokens - memoryTokens - ragTokens,
    );
    const source = summary
      ? history.slice(-RECENT_MESSAGES_TO_KEEP)
      : history.slice(-SLIDING_WINDOW_SIZE);
    const fitted = takeLatestWithinBudget(
      source.map((message) => ({
        role: message.role,
        content: message.content,
        tokenCount: message.tokenCount,
      })),
      historyBudget,
    );

    const messages: ModelMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    if (memoryText) messages.push({ role: "system", content: memoryText });
    if (ragText) messages.push({ role: "system", content: ragText });
    if (summaryText) messages.push({ role: "system", content: summaryText });
    for (const message of fitted.selected) {
      if (message.role === "system") continue;
      messages.push({ role: message.role, content: message.content });
    }

    const debugInfo: ContextDebugInfo = {
      totalTokens:
        systemPromptTokens + memoryTokens + ragTokens + summaryTokens + fitted.used,
      historyTokens: fitted.used,
      systemPromptTokens,
      summaryTokens,
      memoryTokens,
      ragTokens,
    };

    return { messages, debugInfo, retrievedMemories, ragChunks, summary };
  } catch (error) {
    console.error("buildConversationContext failed", error);
    const messages: ModelMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    return {
      messages,
      debugInfo: {
        totalTokens: systemPromptTokens,
        historyTokens: 0,
        systemPromptTokens,
        summaryTokens: 0,
        memoryTokens: 0,
        ragTokens: 0,
      } satisfies ContextDebugInfo,
      retrievedMemories: [],
      ragChunks: [],
      summary: null,
    };
  }
}
