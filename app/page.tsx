"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Sidebar } from "@/components/sidebar/sidebar";
import type { ConversationItem } from "@/components/sidebar/conversation-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function HomePage() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/conversations");
    const data = (await response.json()) as ConversationItem[] | { error?: string };
    if (!response.ok || !Array.isArray(data)) {
      setError("error" in data ? data.error ?? "读取会话失败" : "读取会话失败");
      return;
    }
    setItems(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/conversations");
      const data = (await response.json()) as ConversationItem[] | { error?: string };
      if (cancelled) return;
      if (!response.ok || !Array.isArray(data)) {
        setError("error" in data ? data.error ?? "读取会话失败" : "读取会话失败");
        return;
      }
      setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createConversation() {
    const response = await fetch("/api/conversations", { method: "POST" });
    const data = (await response.json()) as ConversationItem & { error?: string };
    if (!response.ok) {
      setError(data.error ?? "创建会话失败");
      return;
    }
    setCurrentId(data.id);
    setOpen(false);
    await load();
  }

  async function removeConversation(id: string) {
    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("删除会话失败");
      return;
    }
    if (currentId === id) setCurrentId(null);
    await load();
  }

  const sidebar = (
    <Sidebar
      items={items}
      currentId={currentId}
      onCreate={createConversation}
      onSelect={(id) => {
        setCurrentId(id);
        setOpen(false);
      }}
      onDelete={removeConversation}
    />
  );

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-72 shrink-0 border-r md:block">{sidebar}</aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b p-2 md:hidden">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Menu />
            会话
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
        {error ? <p className="hidden px-4 pt-2 text-sm text-destructive md:block">{error}</p> : null}
        <ChatPanel
          conversationId={currentId}
          onConversationCreated={(id) => {
            setCurrentId(id);
            void load();
          }}
          onFinish={() => void load()}
        />
      </main>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>会话列表</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>
    </div>
  );
}
