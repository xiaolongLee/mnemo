import { listMessagesByConversation } from "@/lib/db/queries/messages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await listMessagesByConversation(id);
    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "读取消息失败" }, { status: 500 });
  }
}
