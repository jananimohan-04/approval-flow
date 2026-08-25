import type { AppNotification } from "../types";

/**
 * Realtime transport abstraction.
 *
 * The MVP uses an in-process event bus backed by the local store, so approver
 * screens update without a page refresh. Later this module can be reimplemented
 * on Supabase Realtime, WebSockets, Web Push, or a Google Apps Script poller
 * without any changes to the components that subscribe here.
 */

export type RealtimeEvent =
  | { type: "notification.created"; notification: AppNotification }
  | { type: "approval.changed"; approvalId: string };

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
