"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ChatInput } from "@/components/chat/chat-input";
import { DebugPanel } from "@/components/chat/debug-panel";
import { MessageList } from "@/components/chat/message-list";

type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * 不用 useChat。它的 transport 会缓存 conversationId，
 * 首条消息自动建会话之后，没法带着新 id 立刻发送。
 */
export function ChatPanel({
  conversationId,
  onConversationCreated,
  onFinish,
}: {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onFinish: () => void;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const conversationIdRef = useRef(conversationId);
  const skipLoadRef = useRef(false);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (skipLoadRef.current) {
      skipLoadRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = (await response.json()) as StoredMessage[] | { error?: string };
      if (cancelled) return;
      if (!response.ok || !Array.isArray(data)) {
        setError("error" in data ? data.error ?? "读取历史失败" : "读取历史失败");
        return;
      }
      setMessages(
        data
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text", text: message.content }],
          })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  async function send(text: string) {
    setError(null);
    setLoading(true);
    setWaiting(true);
    let id = conversationIdRef.current;
    const assistantId = crypto.randomUUID();
    try {
      if (!id) {
        const created = await fetch("/api/conversations", { method: "POST" });
        const conversation = (await created.json()) as { id?: string; error?: string };
        if (!created.ok || !conversation.id) {
          throw new Error(conversation.error ?? "创建会话失败");
        }
        id = conversation.id;
        conversationIdRef.current = id;
        skipLoadRef.current = true;
        onConversationCreated(id);
      }
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] },
        { id: assistantId, role: "assistant", parts: [{ type: "text", text: "" }] },
      ]);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: id,
          messages: [{ role: "user", content: text }],
        }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "发送失败");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setWaiting(false);
        const snapshot = accumulated;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, parts: [{ type: "text", text: snapshot }] }
              : message,
          ),
        );
      }
      if (!accumulated.trim()) {
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        throw new Error("模型没有返回内容，请检查模型是否可用");
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "发送失败");
    } finally {
      setLoading(false);
      setWaiting(false);
      setRefreshKey((key) => key + 1);
      onFinish();
      window.setTimeout(onFinish, 1500);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <MessageList messages={messages} waiting={waiting} onSuggest={send} />
      {error ? <p className="px-4 pb-2 text-sm text-destructive">{error}</p> : null}
      <ChatInput disabled={loading} onSend={send} />
      <DebugPanel conversationId={conversationIdRef.current ?? conversationId} refreshKey={refreshKey} />
    </div>
  );
}
