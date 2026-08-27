/**
 * Domain model for Nexus AI Operations Assistant.
 * Fully aligned with Supabase PostgreSQL schema.
 */

export type AppRole = 'super_admin' | 'company_admin' | 'admin' | 'department_user'; // 'admin' kept for legacy migrating
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected' | 'unassigned';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';

export interface CompanyModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  auth_user_id?: string;
  company_id: string;
  name: string;
  email: string;
  department_id: string;
  role: AppRole;
  active: boolean;
  created_at?: string;
}

export interface DepartmentModel {
  id: string;
  company_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppTask {
  company_id: string;
  id: string;
  title: string;
  description: string | null;
  source_file_id: string | null; // references data_sources(id)
  source_file_name: string | null;
  source_sheet_name: string | null;
  source_row_key: string | null;
  department_id: string | null; // references departments(id)
  assigned_user_id: string | null; // references app_users(id)
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string | null;
  ai_classification: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AiRule {
  id: string;
  company_id: string;
  name: string;
  prompt_instruction: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = "task_assigned" | "task_updated" | "system_alert";

export interface AppNotification {
  company_id: string;
  id: string;
  user_id: string | null;
  department_id: string | null;
  task_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface ActivityLog {
  company_id: string;
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── Google Drive Integration ───────────────────────────────────────────

export interface GoogleDriveConnection {
  company_id: string;
  id: string;
  user_id: string;
  google_account_email: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  expiry: string | null;
  scopes: string | null;
  status: string;
  selected_folder_id: string | null;
  selected_folder_name: string | null;
  created_at: string;
  updated_at: string;
}

// Data Sources (formerly monitored files)
export interface DataSourceModel {
  id: string;
  company_id: string | null;
  google_file_id: string;
  google_folder_id: string | null;
  file_name: string;
  file_type: string | null;
  schema_snapshot: Record<string, string[]> | null;
  mime_type: string | null;
  enabled: boolean;
  last_modified_at: string | null;
  last_synced_at: string | null;
  row_count: number;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

// Rows
export interface DataSourceRow {
  id: string;
  data_source_id: string;
  sheet_name: string;
  row_key: string;
  row_hash: string;

  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

// Standardized mapping aliases for code compatibility if needed
// Note: We use the actual Postgres naming globally now
export type DriveFolder = { id: string; name: string; mimeType: string; modifiedTime: string };
export type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string; size?: string };
export type GoogleDriveConnectionSafe = GoogleDriveConnection;

export interface ClassificationResult {
  department: string;
  is_actionable: boolean;
  task_title: string;
  task_description: string;
  priority: "low" | "medium" | "high" | "critical" | "urgent";
  confidence: number;
}

export interface QAAnswer {
  answer: string;
  sources: { file: string; sheet: string }[];
}

export interface Database {
  companies: CompanyModel[];
  users: AppUser[];
  departments: DepartmentModel[];
  tasks: AppTask[];
  ai_rules: AiRule[];
  notifications: AppNotification[];
  activity_logs: ActivityLog[];
  google_drive_connections: GoogleDriveConnection[];
  data_sources: DataSourceModel[];
  data_source_rows: DataSourceRow[];

  session_user_id: string | null; // local state only
  session_initialized?: boolean;
}
