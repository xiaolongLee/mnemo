import { z } from "zod";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { createMemory, listMemoriesByUser } from "@/lib/db/queries/memories";
import { generateEmbedding } from "@/lib/utils/embeddings";

const bodySchema = z.object({
  content: z.string().min(1),
  category: z.enum(["preference", "fact", "behavior"]),
});

export async function GET() {
  try {
    const rows = await listMemoriesByUser(DEFAULT_USER_ID);
    return Response.json(
      rows.map(({ embedding: _embedding, ...memory }) => memory),
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "读取记忆失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "内容或分类不正确" }, { status: 400 });
    }
    const embedding = await generateEmbedding(parsed.data.content);
    const row = await createMemory({
      userId: DEFAULT_USER_ID,
      content: parsed.data.content,
      category: parsed.data.category,
      embedding,
    });
    const { embedding: _embedding, ...memory } = row;
    return Response.json(memory, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "保存记忆失败" }, { status: 500 });
  }
}
