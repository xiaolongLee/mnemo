import { z } from "zod";
import { deleteMemory, updateMemory } from "@/lib/db/queries/memories";
import { generateEmbedding } from "@/lib/utils/embeddings";

const bodySchema = z.object({
  content: z.string().min(1),
  category: z.enum(["preference", "fact", "behavior"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "内容或分类不正确" }, { status: 400 });
    }
    const embedding = await generateEmbedding(parsed.data.content);
    const row = await updateMemory(id, {
      content: parsed.data.content,
      category: parsed.data.category,
      embedding,
    });
    if (!row) return Response.json({ error: "记忆不存在" }, { status: 404 });
    const { embedding: _embedding, ...memory } = row;
    return Response.json(memory);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "更新记忆失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteMemory(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "删除记忆失败" }, { status: 500 });
  }
}
