/**
 * Domain model for the Vehicle Approval & Voice Notification System.
 *
 * These types mirror the intended relational schema (users, vehicle_entries,
 * approval_requests, notifications, activity_logs, approval_rules). Keep them
 * loose enough to absorb column changes once the real Excel / Google Drive
 * structure is confirmed.
 */

export type UserRole = "admin" | "data_entry" | "approver";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string;
  department: string;
  active: boolean;
  created_at: string;
}

export interface VehicleEntry {
  id: string;
  vehicle_number: string;
  company_name: string;
  driver_name: string;
  vehicle_type: string;
  location: string;
  entry_date: string;
  entry_time: string;
  remarks: string;
  created_by: string; // users.id
  created_at: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  vehicle_entry_id: string;
  approver_id: string | null;
  status: ApprovalStatus;
  remarks: string;
  rejection_reason: string;
  created_at: string;
  actioned_at: string | null;
}

export type NotificationType =
  | "approval_request"
  | "approval_result"
  | "assignment_required"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  related_id: string | null; // approval_requests.id
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
}

export interface ApprovalRule {
  id: string;
  branch: string;
  company_name: string;
  vehicle_type: string; // "*" means any
  approver_id: string;
  backup_approver_id: string | null;
}

export interface UserSettings {
  voice_enabled: boolean;
  voice_language: "en" | "ta";
}

export interface Database {
  users: User[];
  vehicle_entries: VehicleEntry[];
  approval_requests: ApprovalRequest[];
  notifications: AppNotification[];
  activity_logs: ActivityLog[];
  approval_rules: ApprovalRule[];
  settings: Record<string, UserSettings>;
  session_user_id: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  data_entry: "Data Entry",
  approver: "Approver",
};

export const VEHICLE_TYPES = [
  "Container Truck",
  "Trailer",
  "Tanker",
  "Mini Truck",
  "Tipper",
  "Van",
] as const;
