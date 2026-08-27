import { dataSourceService } from "../data/dataSource";
import { getDb, mutate, uid } from "../store";
import type { AppNotification, NotificationType } from "../types";
import { activityService } from "./activityService";
import { realtime } from "./realtime";

export interface UserSettings {
  voice_enabled: boolean;
  voice_language: string;
}

const DEFAULT_SETTINGS: UserSettings = { voice_enabled: true, voice_language: "en" };

export const notificationService = {
  async create(input: {
    user_id: string | null;
    title: string;
    message: string;
    type: string;
    department_id?: string | null;
    task_id?: string | null;
    company_id: string;
  }): Promise<AppNotification> {
    const notification: AppNotification = {
      id: uid("n"),
      company_id: input.company_id,
      user_id: input.user_id,
      department_id: input.department_id ?? null,
      task_id: input.task_id ?? null,
      title: input.title,
      message: input.message,
      type: input.type,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    await dataSourceService.insert("notifications", notification);
    activityService.log({
      user_id: input.user_id || "system",
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

  async markRead(id: string) {
    const notification = dataSourceService.list("notifications").find((n) => n.id === id);
    if (!notification || notification.is_read) return;
    await dataSourceService.update("notifications", id, {
      is_read: true,
      read_at: new Date().toISOString()
    });
  },

  async markAllRead(userId: string) {
    const unread = dataSourceService.list("notifications").filter(n => n.user_id === userId && !n.is_read);
    const readAt = new Date().toISOString();
    const promises = unread.map(n => dataSourceService.update("notifications", n.id, {
      is_read: true,
      read_at: readAt
    }));
    await Promise.all(promises);
  },

  // Settings are not in the Database model explicitly unless we add them
  // For the MVP, we can just store them in localStorage separately or keep them in the mock store.
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem("nexus_user_settings");
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings) {
    try {
      localStorage.setItem("nexus_user_settings", JSON.stringify(settings));
    } catch { }
  },
};
