"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import { TOTAL_TOKEN_BUDGET } from "@/lib/constants";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type DebugResponse = {
  summary: {
    content: string;
    coveredMessageCount: number;
    tokenCount: number;
    updatedAt: string;
  } | null;
  context: {
    totalTokens: number;
    summaryTokens: number;
    historyTokens: number;
    systemPromptTokens: number;
    memoryTokens: number;
    ragTokens: number;
  };
  memories: Array<{ id: string; content: string; category: string; similarity: number }>;
  ragChunks: Array<{ content: string; filename: string; similarity: number }>;
};

const PARTS = [
  ["systemPromptTokens", "系统提示"],
  ["memoryTokens", "记忆"],
  ["ragTokens", "RAG"],
  ["summaryTokens", "摘要"],
  ["historyTokens", "历史"],
] as const;

export function DebugPanel({
  conversationId,
  refreshKey,
}: {
  conversationId: string | null;
  refreshKey: number;
}) {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(280);
  const [data, setData] = useState<DebugResponse | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !conversationId) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(`/api/conversations/${conversationId}/debug`);
      if (!response.ok) return;
      const json = (await response.json()) as DebugResponse;
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshKey]);

  if (process.env.NODE_ENV === "production") return null;

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const startY = event.clientY;
    const startHeight = height;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    function move(next: PointerEvent) {
      const nextHeight = Math.min(560, Math.max(160, startHeight + startY - next.clientY));
      setHeight(nextHeight);
    }
    function stop() {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  const context = data?.context;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t">
      <div className="h-1.5 cursor-ns-resize bg-border" onPointerDown={startDrag} />
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-muted-foreground">
        <span>调试面板</span>
        <span>{open ? "收起" : "展开"}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 overflow-auto px-3 pb-3 text-xs" style={{ height }}>
          {!conversationId || !context ? (
            <p className="text-muted-foreground">发送一条消息后，这里会显示上下文是怎么拼出来的。</p>
          ) : (
            <>
              <div>
                <div className="mb-1 flex justify-between">
                  <span>总计 {context.totalTokens}</span>
                  <span>预算 {TOTAL_TOKEN_BUDGET}</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded bg-muted">
                  {PARTS.map(([key, label]) => (
                    <div
                      key={key}
                      title={`${label} ${context[key]}`}
                      className="h-full bg-foreground/70 odd:bg-foreground/40"
                      style={{ width: `${(context[key] / TOTAL_TOKEN_BUDGET) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-3">
                  {PARTS.map(([key, label]) => (
                    <span key={key}>
                      {label} {context[key]}
                    </span>
                  ))}
                </div>
              </div>
              <section>
                <p className="mb-1 font-medium">摘要</p>
                {data.summary ? (
                  <>
                    <p className="mb-1 text-muted-foreground">
                      覆盖 {data.summary.coveredMessageCount} 条 ·{" "}
                      {new Date(data.summary.updatedAt).toLocaleString()}
                    </p>
                    <Streamdown plugins={{ code }}>{data.summary.content}</Streamdown>
                  </>
                ) : (
                  <p className="text-muted-foreground">还没有摘要</p>
                )}
              </section>
              <section>
                <p className="mb-1 font-medium">检索到的记忆</p>
                {data.memories.length === 0 ? (
                  <p className="text-muted-foreground">没有命中</p>
                ) : (
                  data.memories.map((memory) => (
                    <p key={memory.id}>
                      [{memory.category}] {memory.content} · {memory.similarity.toFixed(2)}
                    </p>
                  ))
                )}
              </section>
              <section>
                <p className="mb-1 font-medium">检索到的文档</p>
                {data.ragChunks.length === 0 ? (
                  <p className="text-muted-foreground">没有命中</p>
                ) : (
                  data.ragChunks.map((chunk, index) => (
                    <p key={`${chunk.filename}-${index}`}>
                      《{chunk.filename}》 · {chunk.similarity.toFixed(2)} ·{" "}
                      {chunk.content.slice(0, 80)}
                    </p>
                  ))
                )}
              </section>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
