"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MemoryEditor, type MemoryCategory } from "@/components/memories/memory-editor";
import { MemoryList, type MemoryItem } from "@/components/memories/memory-list";

export default function MemoriesPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/memories");
    const data = (await response.json()) as MemoryItem[] | { error?: string };
    if (!response.ok || !Array.isArray(data)) {
      setError("error" in data ? data.error ?? "读取记忆失败" : "读取记忆失败");
      return;
    }
    setItems(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function create(input: { content: string; category: MemoryCategory }) {
    const response = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "保存失败");
      return;
    }
    await load();
  }

  async function update(id: string, input: { content: string; category: MemoryCategory }) {
    const response = await fetch(`/api/memories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "更新失败");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("删除失败");
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">长期记忆</h1>
        <Link href="/" className="text-sm hover:underline">
          返回聊天
        </Link>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MemoryEditor submitLabel="添加" onSubmit={create} />
      <MemoryList items={items} onUpdate={update} onDelete={remove} />
    </main>
  );
}
