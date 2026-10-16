import { generateText } from "ai";
import { MAX_SUMMARY_TOKENS } from "@/lib/constants";
import { chatModel } from "@/lib/ai/provider";
import { SUMMARY_PROMPT } from "@/lib/ai/prompts";

type SummaryMessage = { role: string; content: string };

export async function generateSummary(
  oldSummary: string | null,
  messages: SummaryMessage[],
) {
  const existingSummary = oldSummary
    ? `${oldSummary}\n\n请将新内容与已有摘要合并。`
    : "这是第一次摘要，还没有已有摘要。";
  const newMessages = messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
  try {
    const result = await generateText({
      model: chatModel,
      prompt: SUMMARY_PROMPT.replace("{existingSummary}", existingSummary).replace(
        "{newMessages}",
        newMessages,
      ),
      maxOutputTokens: MAX_SUMMARY_TOKENS,
    });
    return result.text.trim();
  } catch (error) {
    console.error("generateSummary failed", error);
    return oldSummary ?? "";
  }
}
