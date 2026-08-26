import { dataSourceService } from "../data/dataSource";
import { uid } from "../store";
import type { ActivityLog } from "../types";

export const activityService = {
  async log(input: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    description: string;
  }): Promise<ActivityLog> {
    const entry: ActivityLog = {
      id: uid("l"),
      user_id: input.user_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      metadata: { description: input.description },
      created_at: new Date().toISOString(),
    };
    return await dataSourceService.insert("activity_logs", entry) as ActivityLog;
  },

  list(): ActivityLog[] {
    return dataSourceService.list("activity_logs");
  },
};
