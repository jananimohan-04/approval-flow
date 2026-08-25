import type { Database } from "../types";

/**
 * Demo seed data. This is the ONLY place where fixture rows live.
 * When the real Google Drive / Excel sync lands, swap the demo data source
 * (see ./dataSource.ts) instead of touching feature code.
 */

const NOW = "2026-08-25T10:30:00.000Z";

export function seedDatabase(): Database {
  const users: Database["users"] = [
    {
      id: "u-admin",
      name: "Admin User",
      email: "admin@demo.com",
      role: "admin",
      branch: "Chennai",
      department: "Operations",
      active: true,
      created_at: "2026-06-01T04:00:00.000Z",
    },
    {
      id: "u-arun",
      name: "Arun",
      email: "entry@demo.com",
      role: "data_entry",
      branch: "Chennai",
      department: "Gate Control",
      active: true,
      created_at: "2026-06-02T04:00:00.000Z",
    },
    {
      id: "u-kumar",
      name: "Kumar",
      email: "approver@demo.com",
      role: "approver",
      branch: "Chennai",
      department: "Operations",
      active: true,
      created_at: "2026-06-02T04:00:00.000Z",
    },
    {
      id: "u-priya",
      name: "Priya",
      email: "priya@demo.com",
      role: "approver",
      branch: "Chennai",
      department: "Logistics",
      active: true,
      created_at: "2026-06-05T04:00:00.000Z",
    },
    {
      id: "u-ravi",
      name: "Ravi",
      email: "ravi@demo.com",
      role: "approver",
      branch: "Bangalore",
      department: "Operations",
      active: true,
      created_at: "2026-06-07T04:00:00.000Z",
    },
    {
      id: "u-meena",
      name: "Meena",
      email: "meena@demo.com",
      role: "data_entry",
      branch: "Bangalore",
      department: "Gate Control",
      active: false,
      created_at: "2026-06-09T04:00:00.000Z",
    },
  ];

  const vehicle_entries: Database["vehicle_entries"] = [
    {
      id: "v-1",
      vehicle_number: "TN01AB1234",
      company_name: "ABC Transport",
      driver_name: "Ramesh",
      vehicle_type: "Container Truck",
      location: "Chennai",
      entry_date: "2026-08-25",
      entry_time: "10:30",
      remarks: "Inbound consignment, gate 4.",
      created_by: "u-arun",
      created_at: NOW,
    },
    {
      id: "v-2",
      vehicle_number: "TN02CD5678",
      company_name: "XYZ Logistics",
      driver_name: "Suresh",
      vehicle_type: "Trailer",
      location: "Chennai",
      entry_date: "2026-08-25",
      entry_time: "09:45",
      remarks: "Empty return trailer.",
      created_by: "u-arun",
      created_at: "2026-08-25T09:45:00.000Z",
    },
    {
      id: "v-3",
      vehicle_number: "TN03EF9999",
      company_name: "Omka Haulage",
      driver_name: "Vinoth",
      vehicle_type: "Tanker",
      location: "Bangalore",
      entry_date: "2026-08-25",
      entry_time: "08:12",
      remarks: "Missing RC document at gate.",
      created_by: "u-arun",
      created_at: "2026-08-25T08:12:00.000Z",
    },
  ];

  const approval_requests: Database["approval_requests"] = [
    {
      id: "a-1",
      vehicle_entry_id: "v-1",
      approver_id: "u-kumar",
      status: "pending",
      remarks: "",
      rejection_reason: "",
      created_at: NOW,
      actioned_at: null,
    },
    {
      id: "a-2",
      vehicle_entry_id: "v-2",
      approver_id: "u-priya",
      status: "approved",
      remarks: "Documents verified.",
      rejection_reason: "",
      created_at: "2026-08-25T09:45:00.000Z",
      actioned_at: "2026-08-25T09:58:00.000Z",
    },
    {
      id: "a-3",
      vehicle_entry_id: "v-3",
      approver_id: "u-ravi",
      status: "rejected",
      remarks: "",
      rejection_reason: "Missing RC document.",
      created_at: "2026-08-25T08:12:00.000Z",
      actioned_at: "2026-08-25T08:40:00.000Z",
    },
  ];

  const approval_rules: Database["approval_rules"] = [
    {
      id: "r-1",
      branch: "Chennai",
      company_name: "ABC Transport",
      vehicle_type: "*",
      approver_id: "u-kumar",
      backup_approver_id: "u-priya",
    },
    {
      id: "r-2",
      branch: "Chennai",
      company_name: "XYZ Logistics",
      vehicle_type: "*",
      approver_id: "u-priya",
      backup_approver_id: "u-kumar",
    },
    {
      id: "r-3",
      branch: "Bangalore",
      company_name: "ABC Transport",
      vehicle_type: "*",
      approver_id: "u-ravi",
      backup_approver_id: null,
    },
  ];

  const notifications: Database["notifications"] = [
    {
      id: "n-1",
      user_id: "u-kumar",
      title: "New Approval Request",
      message: "New vehicle approval request: TN01AB1234 (ABC Transport)",
      notification_type: "approval_request",
      related_id: "a-1",
      is_read: false,
      created_at: NOW,
    },
    {
      id: "n-2",
      user_id: "u-arun",
      title: "Vehicle Approved",
      message: "Vehicle TN02CD5678 was approved by Priya.",
      notification_type: "approval_result",
      related_id: "a-2",
      is_read: false,
      created_at: "2026-08-25T09:58:00.000Z",
    },
    {
      id: "n-3",
      user_id: "u-arun",
      title: "Vehicle Rejected",
      message: "Vehicle TN03EF9999 was rejected by Ravi.",
      notification_type: "approval_result",
      related_id: "a-3",
      is_read: true,
      created_at: "2026-08-25T08:40:00.000Z",
    },
  ];

  const activity_logs: Database["activity_logs"] = [
    {
      id: "l-1",
      user_id: "u-arun",
      action: "vehicle.created",
      entity_type: "vehicle_entry",
      entity_id: "v-1",
      description: "Vehicle TN01AB1234 added",
      created_at: NOW,
    },
    {
      id: "l-2",
      user_id: "u-arun",
      action: "approval.assigned",
      entity_type: "approval_request",
      entity_id: "a-1",
      description: "Approval for TN01AB1234 assigned to Kumar",
      created_at: NOW,
    },
    {
      id: "l-3",
      user_id: "u-priya",
      action: "approval.approved",
      entity_type: "approval_request",
      entity_id: "a-2",
      description: "Vehicle TN02CD5678 approved",
      created_at: "2026-08-25T09:58:00.000Z",
    },
    {
      id: "l-4",
      user_id: "u-ravi",
      action: "approval.rejected",
      entity_type: "approval_request",
      entity_id: "a-3",
      description: "Vehicle TN03EF9999 rejected (Missing RC document)",
      created_at: "2026-08-25T08:40:00.000Z",
    },
  ];

  return {
    users,
    vehicle_entries,
    approval_requests,
    notifications,
    activity_logs,
    approval_rules,
    settings: {},
    session_user_id: null,
  };
}
