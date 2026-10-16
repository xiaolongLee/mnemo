"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type MemoryCategory = "preference" | "fact" | "behavior";

const OPTIONS: Array<{ value: MemoryCategory; label: string }> = [
  { value: "preference", label: "偏好" },
  { value: "fact", label: "事实" },
  { value: "behavior", label: "行为" },
];

export function MemoryEditor({
  initialContent = "",
  initialCategory = "fact",
  submitLabel,
  onSubmit,
}: {
  initialContent?: string;
  initialCategory?: MemoryCategory;
  submitLabel: string;
  onSubmit: (input: { content: string; category: MemoryCategory }) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState<MemoryCategory>(initialCategory);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!content.trim()) return;
        setPending(true);
        try {
          await onSubmit({ content: content.trim(), category });
          if (!initialContent) setContent("");
        } finally {
          setPending(false);
        }
      }}
    >
      <Textarea
        value={content}
        rows={3}
        placeholder="写一条关于用户的记忆"
        onChange={(event) => setContent(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={category === option.value ? "default" : "outline"}
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Button type="submit" size="sm" disabled={pending || !content.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
