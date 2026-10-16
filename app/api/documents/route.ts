import { after } from "next/server";
import { processDocument } from "@/lib/ai/document-processor";
import { DEFAULT_USER_ID } from "@/lib/constants";
import {
  createDocument,
  listDocumentsByUser,
  updateDocumentStatus,
} from "@/lib/db/queries/documents";
import { extractText } from "@/lib/utils/text-extractor";

const ALLOWED = new Set(["txt", "md", "pdf", "doc", "docx"]);
const MAX_BYTES = 10 * 1024 * 1024;

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : "";
}

export async function GET() {
  try {
    return Response.json(await listDocumentsByUser(DEFAULT_USER_ID));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "读取文档失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "请选择文件" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "文件不能超过 10MB" }, { status: 400 });
    }
    const extension = extensionOf(file.name);
    if (!ALLOWED.has(extension)) {
      return Response.json({ error: "只支持 txt、md、pdf、doc、docx" }, { status: 400 });
    }

    if (extension === "txt" || extension === "md") {
      const text = await file.text();
      if (!text.trim()) {
        return Response.json({ error: "文件内容是空的" }, { status: 400 });
      }
      const document = await createDocument({
        userId: DEFAULT_USER_ID,
        filename: file.name,
      });
      after(() => processDocument(document.id, text));
      return Response.json(document, { status: 201 });
    }

    const buffer = await file.arrayBuffer();
    const document = await createDocument({
      userId: DEFAULT_USER_ID,
      filename: file.name,
    });
    after(async () => {
      try {
        const text = await extractText(new File([buffer], file.name));
        if (!text.trim()) {
          await updateDocumentStatus(document.id, "error");
          return;
        }
        await processDocument(document.id, text);
      } catch (error) {
        console.error("extractText failed", error);
        try {
          await updateDocumentStatus(document.id, "error");
        } catch (statusError) {
          console.error(statusError);
        }
      }
    });
    return Response.json(document, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "上传文档失败" }, { status: 500 });
  }
}
