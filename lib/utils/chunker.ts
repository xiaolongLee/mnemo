import {
  CHUNK_MAX_TOKENS,
  CHUNK_MIN_TOKENS,
  CHUNK_OVERLAP_TOKENS,
} from "@/lib/constants";
import { estimateTokens } from "@/lib/utils/tokens";

/**
 * 按字符从末尾往前取，直到再取一个字符就会超过 token 上限。
 * 不能按空白切词：纯中文没有空格，按词切会让重叠变成空字符串。
 */
function extractTailByTokens(text: string, maxTokens: number) {
  let tail = "";
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const next = text[index] + tail;
    if (estimateTokens(next) > maxTokens) break;
    tail = next;
  }
  return tail;
}

function splitOversized(piece: string) {
  if (estimateTokens(piece) <= CHUNK_MAX_TOKENS) return [piece];
  const sentences = piece.split(/(?<=[。！？.!?])\s*/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  const pushCurrent = () => {
    if (current) chunks.push(current);
    current = "";
  };
  for (const sentence of sentences) {
    if (estimateTokens(sentence) > CHUNK_MAX_TOKENS) {
      pushCurrent();
      let rest = sentence;
      while (estimateTokens(rest) > CHUNK_MAX_TOKENS) {
        let slice = "";
        for (const char of rest) {
          const next = slice + char;
          if (estimateTokens(next) > CHUNK_MAX_TOKENS) break;
          slice = next;
        }
        if (!slice) break;
        chunks.push(slice);
        rest = rest.slice(slice.length);
      }
      current = rest;
      continue;
    }
    const candidate = current ? `${current}${sentence}` : sentence;
    if (estimateTokens(candidate) > CHUNK_MAX_TOKENS && current) {
      pushCurrent();
      current = sentence;
    } else {
      current = candidate;
    }
  }
  pushCurrent();
  return chunks;
}

export function chunkDocument(text: string): { content: string; tokenCount: number }[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const merged: string[] = [];
  let buffer = "";
  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (estimateTokens(candidate) < CHUNK_MIN_TOKENS) {
      buffer = candidate;
      continue;
    }
    if (buffer && estimateTokens(buffer) >= CHUNK_MIN_TOKENS) {
      merged.push(buffer);
      buffer = paragraph;
      continue;
    }
    buffer = candidate;
    if (estimateTokens(buffer) >= CHUNK_MIN_TOKENS) {
      merged.push(buffer);
      buffer = "";
    }
  }
  if (buffer) merged.push(buffer);

  const pieces = merged.flatMap((piece) => splitOversized(piece));
  return pieces.map((piece, index) => {
    const overlap =
      index === 0 ? "" : extractTailByTokens(pieces[index - 1] ?? "", CHUNK_OVERLAP_TOKENS);
    const content = overlap ? `${overlap}${piece}` : piece;
    return { content, tokenCount: estimateTokens(content) };
  });
}
