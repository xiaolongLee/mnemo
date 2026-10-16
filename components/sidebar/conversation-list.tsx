"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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

export type ConversationItem = {
  id: string;
  title: string | null;
  updatedAt: string;
};

function groupConversations(items: ConversationItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const groups: Array<{ label: string; items: ConversationItem[] }> = [
    { label: "今天", items: [] },
    { label: "昨天", items: [] },
    { label: "更早", items: [] },
  ];
  for (const item of items) {
    const time = new Date(item.updatedAt);
    if (time >= today) groups[0].items.push(item);
    else if (time >= yesterday) groups[1].items.push(item);
    else groups[2].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function ConversationList({
  items,
  currentId,
  onSelect,
  onDelete,
}: {
  items: ConversationItem[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col gap-4">
        {groupConversations(items).map((group) => (
          <section key={group.label}>
            <p className="px-2 pb-1 text-xs text-muted-foreground">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm ${
                      item.id === currentId ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.title || "新对话"}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="删除会话"
                    onClick={() => setPendingId(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <AlertDialog open={pendingId !== null} onOpenChange={(open) => !open && setPendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个会话？</AlertDialogTitle>
            <AlertDialogDescription>会话会从列表里消失，数据库里仍会保留。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingId) onDelete(pendingId);
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
