import { softDeleteConversation } from "@/lib/db/queries/conversations";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await softDeleteConversation(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "删除会话失败" }, { status: 500 });
  }
}
