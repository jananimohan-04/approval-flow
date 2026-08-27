import { dataSourceService } from "../data/dataSource";
import { getDb, uid } from "../store";
import type { ActivityLog } from "../types";

export const activityService = {
  /**
   * Log an activity. Automatically resolves company_id from the user_id.
   * Tracks user actions, system events, and all entity changes.
   */
  async log(input: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    description: string;
    company_id?: string;
  }): Promise<ActivityLog> {
    // Resolve company_id from user if not explicitly provided
    let companyId = input.company_id || "";
    if (!companyId && input.user_id && input.user_id !== "system") {
      const user = getDb().users.find(u => u.id === input.user_id);
      if (user) companyId = user.company_id;
    }

    const entry: ActivityLog = {
      id: uid("l"),
      company_id: companyId,
      user_id: input.user_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      metadata: { description: input.description },
      created_at: new Date().toISOString(),
    };

    try {
      return await dataSourceService.insert("activity_logs", entry) as ActivityLog;
    } catch (e) {
      console.error("Activity log insert failed:", e);
      // Still update local store even if Supabase fails
      return entry;
    }
  },

  /**
   * Get activity logs filtered by role:
   * - super_admin: ALL logs across all companies
   * - company_admin: Only logs from their company
   * - admin: Only logs from their company
   */
  getFilteredLogs(userId: string): ActivityLog[] {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return [];

    const allLogs = db.activity_logs;

    if (user.role === "super_admin") {
      // Super admin sees everything
      return allLogs.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Company admin / admin: filter by company_id
    return allLogs
      .filter(log => log.company_id === user.company_id)
      .sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  /**
   * Resolve a user name from user_id for display
   */
  getUserName(userId: string | null): string {
    if (!userId || userId === "system") return "System";
    const user = getDb().users.find(u => u.id === userId);
    return user ? user.name : "Unknown User";
  },

  /**
   * Resolve company name from company_id for display
   */
  getCompanyName(companyId: string): string {
    if (!companyId) return "—";
    const company = getDb().companies.find(c => c.id === companyId);
    return company ? company.name : "Unknown";
  },

  list(): ActivityLog[] {
    return dataSourceService.list("activity_logs");
  },
};
