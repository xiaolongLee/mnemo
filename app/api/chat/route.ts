import { generateText, streamText } from "ai";
import { after } from "next/server";
import { buildConversationContext } from "@/lib/ai/context-builder";
import { extractMemories, shouldExtractMemory } from "@/lib/ai/memory-extractor";
import { chatModel } from "@/lib/ai/provider";
import { TITLE_GENERATION_PROMPT } from "@/lib/ai/prompts";
import { generateSummary } from "@/lib/ai/summarizer";
import {
  BACKGROUND_MIN_MESSAGES,
  DEFAULT_USER_ID,
  SUMMARY_TRIGGER_THRESHOLD,
} from "@/lib/constants";
import { touchConversation, updateConversationTitle } from "@/lib/db/queries/conversations";
import { listMemoriesByUser } from "@/lib/db/queries/memories";
import {
  countMessagesByConversation,
  createMessage,
  listMessagesByConversation,
} from "@/lib/db/queries/messages";
import { createSummary, getLatestSummary } from "@/lib/db/queries/summaries";
import { scheduleIdleExtraction } from "@/lib/utils/idle-scheduler";
import { estimateTokens } from "@/lib/utils/tokens";

type IncomingMessage = { role?: string; content?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      conversationId?: string;
      messages?: IncomingMessage[];
    };
    const conversationId = body.conversationId;
    const incoming = body.messages ?? [];
    const currentUserMessage = incoming[incoming.length - 1]?.content?.trim() ?? "";
    if (!conversationId || incoming.length === 0 || !currentUserMessage) {
      return Response.json({ error: "缺少 conversationId 或消息内容" }, { status: 400 });
    }

    console.time("context-assembly");
    const context = await buildConversationContext(conversationId, currentUserMessage);
    console.timeEnd("context-assembly");
    console.log(context.debugInfo);

    const instructions = context.messages.filter((message) => message.role === "system");
    const history = context.messages.filter((message) => message.role !== "system");
    const result = streamText({
      model: chatModel,
      instructions,
      messages: [...history, { role: "user", content: currentUserMessage }],
    });

    after(async () => {
      try {
        const assistantText = await result.text;
        await createMessage({
          conversationId,
          role: "user",
          content: currentUserMessage,
          tokenCount: estimateTokens(currentUserMessage),
        });
        await createMessage({
          conversationId,
          role: "assistant",
          content: assistantText,
          tokenCount: estimateTokens(assistantText),
        });
        await touchConversation(conversationId);

        const total = await countMessagesByConversation(conversationId);
        if (total <= 2) {
          try {
            const titleResult = await generateText({
              model: chatModel,
              maxRetries: 0,
              prompt: TITLE_GENERATION_PROMPT.replace(
                "{userMessage}",
                currentUserMessage,
              ).replace("{assistantMessage}", assistantText),
            });
            const title = titleResult.text.trim().slice(0, 200);
            if (title) await updateConversationTitle(conversationId, title);
          } catch (error) {
            console.error("title generation failed", error);
          }
        }

        try {
          const latest = await getLatestSummary(conversationId);
          const covered = latest?.coveredMessageCount ?? 0;
          const uncovered = total - covered;
          if (uncovered >= SUMMARY_TRIGGER_THRESHOLD) {
            const all = await listMessagesByConversation(conversationId);
            const summary = await generateSummary(latest?.content ?? null, all.slice(covered));
            if (summary) {
              await createSummary({
                conversationId,
                content: summary,
                coveredMessageCount: total,
                tokenCount: estimateTokens(summary),
              });
            }
          }
        } catch (error) {
          console.error("summary failed", error);
        }

        try {
          const decision = await shouldExtractMemory(currentUserMessage);
          if (decision.worthy) {
            const recent = (await listMessagesByConversation(conversationId)).slice(-20);
            const existing = await listMemoriesByUser(DEFAULT_USER_ID);
            console.log("Hot path triggered", decision.reason);
            await extractMemories(recent, existing, DEFAULT_USER_ID, "hot-path");
          } else {
            console.log("Hot path skipped", decision.reason);
          }
        } catch (error) {
          console.error("hot path failed", error);
        }

        scheduleIdleExtraction(conversationId, async () => {
          try {
            const count = await countMessagesByConversation(conversationId);
            if (count < BACKGROUND_MIN_MESSAGES) {
              console.log("Background extraction skipped");
              return;
            }
            const recent = (await listMessagesByConversation(conversationId)).slice(-20);
            const existing = await listMemoriesByUser(DEFAULT_USER_ID);
            console.log("Background extraction triggered");
            await extractMemories(recent, existing, DEFAULT_USER_ID, "background");
          } catch (error) {
            console.error("background extraction failed", error);
          }
        });
      } catch (error) {
        console.error("chat after() failed", error);
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "聊天失败，请稍后重试" }, { status: 500 });
  }
}
