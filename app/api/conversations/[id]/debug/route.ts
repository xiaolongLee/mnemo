import { buildConversationContext } from "@/lib/ai/context-builder";
import { listMessagesByConversation } from "@/lib/db/queries/messages";
import { getLatestSummary } from "@/lib/db/queries/summaries";

/** 教学用调试接口，不用于生产。 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const history = await listMessagesByConversation(id);
    const lastUser = [...history].reverse().find((message) => message.role === "user");
    const [summary, context] = await Promise.all([
      getLatestSummary(id),
      buildConversationContext(id, lastUser?.content),
    ]);
    return Response.json({
      summary: summary
        ? {
            content: summary.content,
            coveredMessageCount: summary.coveredMessageCount,
            tokenCount: summary.tokenCount,
            updatedAt: summary.createdAt,
          }
        : null,
      context: context.debugInfo,
      memories: context.retrievedMemories,
      ragChunks: context.ragChunks,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "读取调试信息失败" }, { status: 500 });
  }
}
