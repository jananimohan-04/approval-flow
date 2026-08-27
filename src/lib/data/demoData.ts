import type { Database } from "../types";

export function seedDatabase(): Database {
  return {
    companies: [],
    users: [],
    departments: [],
    tasks: [],
    ai_rules: [],
    notifications: [],
    activity_logs: [],
    google_drive_connections: [],
    data_sources: [],
    data_source_rows: [],
    session_user_id: null,
  };
}
