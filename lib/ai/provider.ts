import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * 聊天和 embedding 共用一把 Gemini key。
 * 不接 Anthropic / OpenAI：这个项目的模型层只保留 Google。
 */
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  baseURL: process.env.GOOGLE_GENERATIVE_AI_BASE_URL || undefined,
});

export const chatModel = google(
  process.env.GOOGLE_CHAT_MODEL_ID || "gemini-3.8-flash",
);

export const embeddingModel = google.embedding(
  process.env.GOOGLE_EMBEDDING_MODEL_ID || "gemini-embedding-001",
);
