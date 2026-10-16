import { embed } from "ai";
import { EMBEDDING_DIMENSIONS } from "@/lib/constants";
import { embeddingModel } from "@/lib/ai/provider";

/**
 * gemini-embedding-001 在非 3072 维时不会自动归一化。
 * 余弦检索要求向量长度一致，所以这里手动做 L2 归一化。
 */
function l2Normalize(values: number[]) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return values;
  return values.map((value) => value / norm);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: text,
      dimensions: EMBEDDING_DIMENSIONS,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "SEMANTIC_SIMILARITY",
        },
      },
    });
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `向量维度是 ${embedding.length}，期望 ${EMBEDDING_DIMENSIONS}`,
      );
    }
    return l2Normalize(embedding);
  } catch (error) {
    console.error("generateEmbedding failed", error);
    throw error;
  }
}
