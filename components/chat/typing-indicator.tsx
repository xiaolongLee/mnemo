export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 text-muted-foreground">
      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
    </div>
  );
}
