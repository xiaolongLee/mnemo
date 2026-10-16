"use client";

import type { UIMessage } from "ai";
import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function textOf(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const mine = message.role === "user";
  const text = textOf(message);
  return (
    <div className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
      <Avatar className="mt-1">
        <AvatarFallback>{mine ? "我" : "M"}</AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          mine ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {mine ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <Streamdown plugins={{ code }}>{text}</Streamdown>
        )}
      </div>
    </div>
  );
}
