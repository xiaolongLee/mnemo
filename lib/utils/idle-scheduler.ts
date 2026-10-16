import { IDLE_TIMEOUT_MS } from "@/lib/constants";

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * 进程内定时器。进程重启后会丢，这是预期：后台提取只是热路径的补充。
 * 在 serverless 上不可靠，因为实例会被回收。本地教学可以接受。
 */
export function scheduleIdleExtraction(
  conversationId: string,
  callback: () => Promise<void> | void,
) {
  clearIdleTimer(conversationId);
  const timer = setTimeout(() => {
    timers.delete(conversationId);
    Promise.resolve()
      .then(callback)
      .catch((error) => {
        console.error("idle extraction callback failed", error);
      });
  }, IDLE_TIMEOUT_MS);
  timers.set(conversationId, timer);
}

export function clearIdleTimer(conversationId: string) {
  const existing = timers.get(conversationId);
  if (existing) clearTimeout(existing);
  timers.delete(conversationId);
}
