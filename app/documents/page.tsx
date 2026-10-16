"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DocumentItem = {
  id: string;
  filename: string;
  status: "processing" | "ready" | "error";
  totalChunks: number;
  createdAt: string;
};

const STATUS_LABEL = {
  processing: "处理中",
  ready: "就绪",
  error: "失败",
};

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/documents");
    const data = (await response.json()) as DocumentItem[] | { error?: string };
    if (!response.ok || !Array.isArray(data)) {
      setError("error" in data ? data.error ?? "读取文档失败" : "读取文档失败");
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

  useEffect(() => {
    if (!items.some((item) => item.status === "processing")) return;
    const timer = window.setInterval(() => {
      void load();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [items, load]);

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/documents", { method: "POST", body });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "上传失败");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("删除失败");
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col gap-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">文档</h1>
        <Link href="/" className="text-sm hover:underline">
          返回聊天
        </Link>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <label
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-sm ${
          dragging ? "bg-muted" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
      >
        拖拽文件到这里，或点击选择。支持 txt、md、pdf、doc、docx，最大 10MB。
        <input
          type="file"
          accept=".txt,.md,.pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </label>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div>
              <p className="text-sm">{item.filename}</p>
              <p className="text-xs text-muted-foreground">
                {STATUS_LABEL[item.status]} · {item.totalChunks} 块 ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setPendingId(item.id)}>
              删除
            </Button>
          </article>
        ))}
      </div>
      <AlertDialog open={pendingId !== null} onOpenChange={(open) => !open && setPendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个文档？</AlertDialogTitle>
            <AlertDialogDescription>文档和它的分块会一起删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingId) void remove(pendingId);
                setPendingId(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
