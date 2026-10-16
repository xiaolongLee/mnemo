import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";
import WordExtractor from "word-extractor";

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : "";
}

export async function extractText(file: File): Promise<string> {
  const extension = extensionOf(file.name);
  try {
    if (extension === "txt" || extension === "md") return file.text();
    if (extension === "pdf") {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await extractPdfText(buffer, { mergePages: true });
      const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
      return text ?? "";
    }
    if (extension === "docx") {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(await file.arrayBuffer()),
      });
      return result.value;
    }
    if (extension === "doc") {
      const extracted = await new WordExtractor().extract(
        Buffer.from(await file.arrayBuffer()),
      );
      return extracted.getBody();
    }
  } catch (error) {
    console.error(error);
    if (extension === "pdf") {
      throw new Error("PDF 文本提取失败，文件可能已损坏或受密码保护");
    }
    if (extension === "docx") throw new Error("DOCX 文本提取失败，文件可能已损坏");
    if (extension === "doc") throw new Error("DOC 文本提取失败，文件可能已损坏");
    throw new Error("文本提取失败");
  }
  throw new Error("不支持的文件格式");
}
