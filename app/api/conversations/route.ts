import { DEFAULT_USER_ID } from "@/lib/constants";
import {
  createConversation,
  listConversations,
} from "@/lib/db/queries/conversations";

export async function GET() {
  try {
    const rows = await listConversations(DEFAULT_USER_ID);
    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "读取会话失败" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const row = await createConversation(DEFAULT_USER_ID);
    return Response.json(row, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "创建会话失败" }, { status: 500 });
  }
}
