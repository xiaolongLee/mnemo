import { deleteDocument } from "@/lib/db/queries/documents";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "删除文档失败" }, { status: 500 });
  }
}
