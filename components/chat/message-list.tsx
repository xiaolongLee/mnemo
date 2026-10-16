"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUGGESTIONS = [
  "你好，介绍一下你自己",
  "我是做前端的，团队有 12 个人",
  "帮我记住：我喜欢用 pnpm",
];

export function MessageList({
  messages,
  waiting,
  onSuggest,
}: {
  messages: UIMessage[];
  waiting: boolean;
  onSuggest: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-16">
            <p className="text-lg font-medium">开始一段新的对话</p>
            <p className="text-sm text-muted-foreground">可以先点一个例子。</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  onClick={() => onSuggest(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {waiting ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
