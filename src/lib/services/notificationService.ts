import { dataSourceService } from "../data/dataSource";
import { getDb, mutate, uid } from "../store";
import type { AppNotification, NotificationType, UserSettings } from "../types";
import { activityService } from "./activityService";
import { realtime } from "./realtime";

const DEFAULT_SETTINGS: UserSettings = { voice_enabled: true, voice_language: "en" };

export const notificationService = {
  create(input: {
    user_id: string;
    title: string;
    message: string;
    notification_type: NotificationType;
    related_id?: string | null;
  }): AppNotification {
    const notification: AppNotification = {
      id: uid("n"),
      user_id: input.user_id,
      title: input.title,
      message: input.message,
      notification_type: input.notification_type,
      related_id: input.related_id ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    dataSourceService.insert("notifications", notification);
    activityService.log({
      user_id: input.user_id,
      action: "notification.created",
      entity_type: "notification",
      entity_id: notification.id,
      description: `Notification created: ${input.title}`,
    });
    realtime.publish({ type: "notification.created", notification });
    return notification;
  },

  listFor(userId: string): AppNotification[] {
    return dataSourceService
      .list("notifications")
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  unreadCount(userId: string) {
    return this.listFor(userId).filter((n) => !n.is_read).length;
  },

  markRead(id: string) {
    const notification = dataSourceService
      .list("notifications")
      .find((n) => n.id === id);
    if (!notification || notification.is_read) return;
    dataSourceService.update("notifications", id, { is_read: true });
    activityService.log({
      user_id: notification.user_id,
      action: "notification.read",
      entity_type: "notification",
      entity_id: id,
      description: `Notification read: ${notification.title}`,
    });
  },

  markAllRead(userId: string) {
    mutate((db) => ({
      ...db,
      notifications: db.notifications.map((n) =>
        n.user_id === userId ? { ...n, is_read: true } : n,
      ),
    }));
    activityService.log({
      user_id: userId,
      action: "notification.read_all",
      entity_type: "notification",
      entity_id: null,
      description: "All notifications marked as read",
    });
  },

  getSettings(userId: string): UserSettings {
    return getDb().settings[userId] ?? DEFAULT_SETTINGS;
  },

  saveSettings(userId: string, settings: UserSettings) {
    mutate((db) => ({
      ...db,
      settings: { ...db.settings, [userId]: settings },
    }));
  },
};
