// Pure per-user pub/sub logic, split out of event-bus.ts so it's testable
// without pulling in "server-only" (which throws on import outside a Server
// Component context - confirmed by vitest, not assumed - see roles.ts /
// image-urls.ts for the same split-for-testability pattern used elsewhere
// in this codebase). Takes the EventEmitter as a parameter instead of
// owning the globalThis singleton itself, so a test can pass in a scratch
// emitter and assert real routing behavior instead of just trusting the
// one-liners underneath.

import type { EventEmitter } from "node:events";

export type RealtimeEventType = "notification" | "message";

/** Channel name for a given user - the one thing that has to stay correct
 * for publish/subscribe to actually route to the right person and nobody
 * else. */
export function userEventChannel(userId: number): string {
  return `user:${userId}`;
}

export function publishUserEventOn(bus: EventEmitter, userId: number, type: RealtimeEventType): void {
  bus.emit(userEventChannel(userId), type);
}

/** Returns an unsubscribe function, matching Node's EventEmitter.off()
 * semantics: unsubscribing removes only this exact listener, leaving any
 * other listeners on the same channel (e.g. multiple open tabs for the
 * same user) untouched. */
export function subscribeUserEventsOn(
  bus: EventEmitter,
  userId: number,
  listener: (type: RealtimeEventType) => void,
): () => void {
  const channel = userEventChannel(userId);
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
