"use client";

import { useState } from "react";
import { MemoryEditor, type MemoryCategory } from "@/components/memories/memory-editor";
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

export type MemoryItem = {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
  lastAccessedAt: string | null;
};

const LABELS: Record<MemoryCategory, string> = {
  preference: "偏好",
  fact: "事实",
  behavior: "行为",
};

export function MemoryList({
  items,
  onUpdate,
  onDelete,
}: {
  items: MemoryItem[];
  onUpdate: (id: string, input: { content: string; category: MemoryCategory }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border p-3">
            {editingId === item.id ? (
              <MemoryEditor
                initialContent={item.content}
                initialCategory={item.category}
                submitLabel="保存"
                onSubmit={async (input) => {
                  await onUpdate(item.id, input);
                  setEditingId(null);
                }}
              />
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {LABELS[item.category]}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                      编辑
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setPendingId(item.id)}>
                      删除
                    </Button>
                  </div>
                </div>
                <p className="text-sm">{item.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  创建于 {new Date(item.createdAt).toLocaleString()}
                  {item.lastAccessedAt
                    ? ` · 最近命中 ${new Date(item.lastAccessedAt).toLocaleString()}`
                    : " · 还没有命中"}
                </p>
              </>
            )}
          </article>
        ))}
      </div>
      <AlertDialog open={pendingId !== null} onOpenChange={(open) => !open && setPendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条记忆？</AlertDialogTitle>
            <AlertDialogDescription>删除后，之后的对话不会再引用它。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingId) void onDelete(pendingId);
                setPendingId(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
