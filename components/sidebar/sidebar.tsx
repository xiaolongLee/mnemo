"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ConversationList,
  type ConversationItem,
} from "@/components/sidebar/conversation-list";

export function Sidebar({
  items,
  currentId,
  onCreate,
  onSelect,
  onDelete,
}: {
  items: ConversationItem[];
  currentId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <p className="font-medium">Mnemo</p>
          <p className="text-xs text-muted-foreground">记忆系统教学项目</p>
        </div>
        <Button size="sm" onClick={onCreate}>
          新对话
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <ConversationList
            items={items}
            currentId={currentId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t p-3 text-sm">
        <Link href="/memories" className="hover:underline">
          记忆
        </Link>
        <Link href="/documents" className="hover:underline">
          文档
        </Link>
      </div>
    </div>
  );
}
