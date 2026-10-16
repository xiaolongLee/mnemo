/** 上下文总预算。预留约 4200 给模型回复，所以注入内容控制在这以内。 */
export const TOTAL_TOKEN_BUDGET = 16000;
export const SYSTEM_PROMPT_BUDGET = 1500;
export const MEMORY_BUDGET = 500;
export const RAG_BUDGET = 2000;
export const SUMMARY_BUDGET = 800;
export const HISTORY_BUDGET = 6000;
export const CURRENT_MESSAGE_BUDGET = 1000;

/** 还没有摘要时，最多带回最近这么多条原文。 */
export const SLIDING_WINDOW_SIZE = 20;
/** 未被摘要覆盖的消息数达到这个值就再生成一次摘要。以代码为准，不用 spec 里的 20。 */
export const SUMMARY_TRIGGER_THRESHOLD = 10;
/** 已有摘要时，只保留最近这么多条原文，更早的靠摘要。 */
export const RECENT_MESSAGES_TO_KEEP = 10;
export const MAX_SUMMARY_TOKENS = 500;

export const MEMORY_TOP_K = 5;
export const MEMORY_SIMILARITY_THRESHOLD = 0.3;
/** 相似度超过这个值就当成同一条记忆，更新而不是新增。 */
export const MEMORY_DEDUP_THRESHOLD = 0.85;

/** 最后一条消息之后空闲这么久，才跑后台记忆提取。 */
export const IDLE_TIMEOUT_MS = 120_000;
export const BACKGROUND_MIN_MESSAGES = 4;

export const CHUNK_MIN_TOKENS = 300;
export const CHUNK_MAX_TOKENS = 500;
export const CHUNK_OVERLAP_TOKENS = 50;
export const RAG_TOP_K = 5;
export const RAG_SIMILARITY_THRESHOLD = 0.3;

/**
 * 全项目唯一的向量维度。
 * gemini-embedding-001 默认 3072，这里要 1536，调用时必须显式传 dimensions，并做 L2 归一化。
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || "demo-user";
