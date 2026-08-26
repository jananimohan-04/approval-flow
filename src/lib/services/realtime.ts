import type { AppNotification, AppTask } from "../types";

export type RealtimeEvent =
  | { type: "notification.created"; notification: AppNotification }
  | { type: "task.updated"; task: AppTask }
  | { type: "task.created"; task: AppTask };

type Handler = (event: RealtimeEvent) => void;
const handlers = new Set<Handler>();

export const realtime = {
  publish(event: RealtimeEvent) {
    handlers.forEach((handler) => handler(event));
  },
  subscribe(handler: Handler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },
};
