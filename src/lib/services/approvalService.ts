import { dataSourceService } from "../data/dataSource";
import { getDb, uid } from "../store";
import type {
  ApprovalRequest,
  ApprovalRule,
  User,
  VehicleEntry,
} from "../types";
import { activityService } from "./activityService";
import { notificationService } from "./notificationService";
import { realtime } from "./realtime";

export interface ApprovalRow {
  request: ApprovalRequest;
  entry: VehicleEntry;
  approver: User | null;
  requester: User | null;
}

function matchRule(rules: ApprovalRule[], entry: Pick<VehicleEntry, "location" | "company_name" | "vehicle_type">) {
  const candidates = rules.filter(
    (r) =>
      r.branch.toLowerCase() === entry.location.toLowerCase() &&
      r.company_name.toLowerCase() === entry.company_name.toLowerCase() &&
      (r.vehicle_type === "*" || r.vehicle_type === entry.vehicle_type),
  );
  // Prefer a specific vehicle-type rule over the wildcard.
  return candidates.sort((a, b) => (a.vehicle_type === "*" ? 1 : -1))[0] ?? null;
}

export const approvalService = {
  /** Approval engine: resolve the approver from the configured mapping. */
  resolveApprover(entry: Pick<VehicleEntry, "location" | "company_name" | "vehicle_type">) {
    const db = getDb();
    const rule = matchRule(db.approval_rules, entry);
    if (!rule) return { approverId: null as string | null, rule: null };
    const primary = db.users.find((u) => u.id === rule.approver_id && u.active);
    if (primary) return { approverId: primary.id, rule };
    const backup = rule.backup_approver_id
      ? db.users.find((u) => u.id === rule.backup_approver_id && u.active)
      : null;
    return { approverId: backup?.id ?? null, rule };
  },

  createEntryWithApproval(
    input: Omit<VehicleEntry, "id" | "created_at">,
    explicitApproverId?: string | null,
  ): { entry: VehicleEntry; request: ApprovalRequest; unassigned: boolean } {
    const db = getDb();
    const entry: VehicleEntry = {
      ...input,
      vehicle_number: input.vehicle_number.toUpperCase(),
      id: uid("v"),
      created_at: new Date().toISOString(),
    };
    dataSourceService.insert("vehicle_entries", entry);

    const resolved = explicitApproverId
      ? { approverId: explicitApproverId }
      : this.resolveApprover(entry);

    const request: ApprovalRequest = {
      id: uid("a"),
      vehicle_entry_id: entry.id,
      approver_id: resolved.approverId ?? null,
      status: "pending",
      remarks: "",
      rejection_reason: "",
      created_at: new Date().toISOString(),
      actioned_at: null,
    };
    dataSourceService.insert("approval_requests", request);

    activityService.log({
      user_id: entry.created_by,
      action: "vehicle.created",
      entity_type: "vehicle_entry",
      entity_id: entry.id,
      description: `Vehicle ${entry.vehicle_number} added`,
    });

    if (request.approver_id) {
      const approver = db.users.find((u) => u.id === request.approver_id);
      activityService.log({
        user_id: entry.created_by,
        action: "approval.assigned",
        entity_type: "approval_request",
        entity_id: request.id,
        description: `Approval for ${entry.vehicle_number} assigned to ${approver?.name ?? "approver"}`,
      });
      notificationService.create({
        user_id: request.approver_id,
        title: "New Approval Request",
        message: `New vehicle approval request: ${entry.vehicle_number} (${entry.company_name})`,
        notification_type: "approval_request",
        related_id: request.id,
      });
    } else {
      activityService.log({
        user_id: entry.created_by,
        action: "approval.unassigned",
        entity_type: "approval_request",
        entity_id: request.id,
        description: `Approval assignment required for ${entry.vehicle_number}`,
      });
      db.users
        .filter((u) => u.role === "admin" && u.active)
        .forEach((admin) =>
          notificationService.create({
            user_id: admin.id,
            title: "Approval assignment required",
            message: `No approver mapping matched ${entry.vehicle_number} (${entry.company_name}, ${entry.location}).`,
            notification_type: "assignment_required",
            related_id: request.id,
          }),
        );
    }

    realtime.publish({ type: "approval.changed", approvalId: request.id });
    return { entry, request, unassigned: !request.approver_id };
  },

  decide(
    requestId: string,
    decision: "approved" | "rejected",
    actor: User,
    text: string,
  ) {
    const db = getDb();
    const request = db.approval_requests.find((r) => r.id === requestId);
    if (!request) return;
    const entry = db.vehicle_entries.find((v) => v.id === request.vehicle_entry_id);

    dataSourceService.update("approval_requests", requestId, {
      status: decision,
      approver_id: actor.id,
      remarks: decision === "approved" ? text : request.remarks,
      rejection_reason: decision === "rejected" ? text : "",
      actioned_at: new Date().toISOString(),
    });

    activityService.log({
      user_id: actor.id,
      action: `approval.${decision}`,
      entity_type: "approval_request",
      entity_id: requestId,
      description:
        decision === "approved"
          ? `Vehicle ${entry?.vehicle_number ?? ""} approved`
          : `Vehicle ${entry?.vehicle_number ?? ""} rejected (${text})`,
    });

    // Mark the approver's request notification as handled.
    db.notifications
      .filter((n) => n.related_id === requestId && !n.is_read)
      .forEach((n) => notificationService.markRead(n.id));

    if (entry) {
      notificationService.create({
        user_id: entry.created_by,
        title: decision === "approved" ? "Vehicle Approved" : "Vehicle Rejected",
        message: `Vehicle ${entry.vehicle_number} was ${decision} by ${actor.name}.`,
        notification_type: "approval_result",
        related_id: requestId,
      });
    }

    realtime.publish({ type: "approval.changed", approvalId: requestId });
  },

  rows(): ApprovalRow[] {
    const db = getDb();
    return db.approval_requests
      .map((request) => {
        const entry = db.vehicle_entries.find((v) => v.id === request.vehicle_entry_id);
        if (!entry) return null;
        return {
          request,
          entry,
          approver: db.users.find((u) => u.id === request.approver_id) ?? null,
          requester: db.users.find((u) => u.id === entry.created_by) ?? null,
        } satisfies ApprovalRow;
      })
      .filter((row): row is ApprovalRow => row !== null)
      .sort((a, b) => b.request.created_at.localeCompare(a.request.created_at));
  },
};
