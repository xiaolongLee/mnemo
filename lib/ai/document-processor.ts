import { batchCreateChunks, updateDocumentStatus } from "@/lib/db/queries/documents";
import { chunkDocument } from "@/lib/utils/chunker";
import { generateEmbedding } from "@/lib/utils/embeddings";

export async function processDocument(documentId: string, text: string) {
  try {
    const chunks = chunkDocument(text);
    for (let index = 0; index < chunks.length; index += 10) {
      const batch = chunks.slice(index, index + 10);
      const rows = await Promise.all(
        batch.map(async (chunk, offset) => ({
          documentId,
          content: chunk.content,
          chunkIndex: index + offset,
          embedding: await generateEmbedding(chunk.content),
          tokenCount: chunk.tokenCount,
        })),
      );
      await batchCreateChunks(rows);
    }
    await updateDocumentStatus(documentId, "ready", chunks.length);
  } catch (error) {
    console.error("processDocument failed", error);
    try {
      await updateDocumentStatus(documentId, "error");
    } catch (statusError) {
      console.error("updateDocumentStatus failed", statusError);
    }
  }
}
