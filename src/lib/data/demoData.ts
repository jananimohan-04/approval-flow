import type { Database } from "../types";

export function seedDatabase(): Database {
  const departments = [
    { id: "dept-1", name: "Administration", description: "System Administration", active: true, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    { id: "dept-2", name: "Accounts", description: "Finance and Accounting", active: true, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    { id: "dept-3", name: "Human Resources", description: "HR and Payroll", active: true, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    { id: "dept-4", name: "Operations", description: "Logistics and Daily Ops", active: true, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
    { id: "dept-5", name: "Management", description: "Executive branch", active: true, created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z" },
  ];

  const users = [
    {
      id: "usr-admin-001",
      name: "Admin User",
      email: "admin@demo.com",
      role: "admin" as const,
      department_id: "dept-1",
      active: true,
      created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z"
    },
    {
      id: "usr-acc-001",
      name: "Accounts User",
      email: "accounts@demo.com",
      role: "department_user" as const,
      department_id: "dept-2",
      active: true,
      created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z"
    },
    {
      id: "usr-hr-001",
      name: "HR User",
      email: "hr@demo.com",
      role: "department_user" as const,
      department_id: "dept-3",
      active: true,
      created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z"
    },
    {
      id: "usr-ops-001",
      name: "Operations User",
      email: "operations@demo.com",
      role: "department_user" as const,
      department_id: "dept-4",
      active: true,
      created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z"
    },
    {
      id: "usr-mgmt-001",
      name: "Management User",
      email: "management@demo.com",
      role: "department_user" as const,
      department_id: "dept-5",
      active: true,
      created_at: "2026-08-01T10:00:00Z", updated_at: "2026-08-01T10:00:00Z"
    }
  ];

  const ai_rules = [
    {
      id: "rule-1",
      name: "Accounts / Finance Rule",
      description: "Auto-routes invoice items",
      keywords: "invoice, payment, vendor, amount, payment status",
      source_conditions: "Accounts.xlsx",
      target_department_id: "dept-2",
      priority: "high" as const,
      active: true,
      created_by: "usr-admin-001",
      created_at: "2026-08-15T12:00:00Z",
      updated_at: "2026-08-15T12:00:00Z",
    }
  ];

  return {
    departments,
    users,
    tasks: [],
    notifications: [],
    activity_logs: [],
    ai_rules,
    session_user_id: null,
    google_drive_connections: [],
    data_sources: [],
    data_source_rows: [],
  };
}
