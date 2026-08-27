import { getDb, uid } from "../store";
import { dataSourceService } from "../data/dataSource";
import { activityService } from "./activityService";
import { notificationService } from "./notificationService";
import { realtime } from "./realtime";
import { classifyRowFn } from "./aiFunctions";
import type { AppTask, TaskPriority, TaskStatus, AiRule } from "../types";

export const taskService = {
  checkAdminRules(row: Record<string, unknown>, sourceFileName: string, sheetName: string, companyId: string): AiRule | null {
    const rules = getDb().ai_rules.filter(r => r.is_active && r.company_id === companyId);

    // Sort by rule order ascending
    rules.sort((a, b) => a.rule_order - b.rule_order);

    const valuesStr = Object.values(row).map(v => String(v)).join(" ").toLowerCase();
    const headersStr = Object.keys(row).join(" ").toLowerCase();
    const searchString = `${sourceFileName} ${sheetName} ${headersStr} ${valuesStr}`.toLowerCase();

    for (const rule of rules) {
      if (!rule.keywords || rule.keywords.length === 0) continue;
      for (const kw of rule.keywords) {
        if (searchString.includes(kw.trim().toLowerCase())) {
          return rule;
        }
      }
    }
    return null;
  },

  async evaluateAndCreateTask(params: {
    source: string;
    sheet: string;
    columns: string[];
    row: Record<string, unknown>;
    source_file_id: string | null;
    source_row_key: string | null;
    created_by: string;
    company_id: string;
  }): Promise<AppTask | null> {
    const explicitRule = this.checkAdminRules(params.row, params.source, params.sheet, params.company_id);

    let department_id: string | null = null;
    let priority: TaskPriority = "medium";
    let aiClassified = false;
    let aiConfidence = 1.0;
    let task_title = "Data update";
    let task_description = `Auto-imported details from ${params.source} (${params.sheet}).\n\nRow Details: \n${JSON.stringify(params.row, null, 2)}`;
    let is_actionable = true;

    if (explicitRule) {
      if (explicitRule.task_action === "ignore") return null;

      if (explicitRule.task_action === "manual_review") {
        department_id = null;
        priority = explicitRule.priority;
      } else {
        department_id = explicitRule.target_department_id;
        priority = explicitRule.priority;
      }
    } else {
      aiClassified = true;
      const deptNames = getDb().departments.filter(d => d.active).map(d => d.name);
      const ruleContext = getDb().ai_rules.filter(r => r.is_active && r.company_id === params.company_id).map(r => ({
        keyword: r.keywords.join(", "),
        department: getDb().departments.find(d => d.id === r.target_department_id)?.name || "Unknown",
        priority: r.priority
      }));

      const aiDecision = await classifyRowFn({
        data: {
          source: params.source,
          sheet: params.sheet,
          columns: params.columns,
          row: params.row,
          departments: deptNames,
          rules: ruleContext,
        }
      });

      if (!aiDecision.is_actionable) {
        return null; // Ignore noisy rows securely!
      }

      const matchDept = getDb().departments.find(d => d.name.toLowerCase() === aiDecision.department.toLowerCase());

      department_id = matchDept ? matchDept.id : null; // Fallback to unclassified if invalid or threshold

      // Threshold checking dynamically overrides
      if (aiDecision.confidence < 0.70) {
        department_id = null; // Forces unclassified review queue
      }

      priority = (aiDecision.priority === "critical" ? "urgent" : aiDecision.priority) as TaskPriority;
      aiConfidence = aiDecision.confidence;
      task_title = aiDecision.task_title;
      task_description = aiDecision.task_description;
    }

    const taskId = uid("tsk");

    // Inject rule metadata if applicable
    const ai_classification = explicitRule ? false : true;
    const ai_confidence = explicitRule ? 1.0 : aiConfidence;

    // Use current session fallback OR explicit params.company_id to isolate perfectly!
    const company_id = params.company_id || getDb().users.find(u => u.id === params.created_by)?.company_id || "demo";

    // Auto-assignment behavior mapping
    let assigned_user_id: string | null = null;
    if (department_id) {
      const activeUsers = getDb().users.filter(u => u.active && u.department_id === department_id && u.company_id === company_id);
      if (activeUsers.length === 1) {
        assigned_user_id = activeUsers[0]!.id;
      } else if (activeUsers.length > 1) {
        // Assign to least loaded stringently
        const deptTasks = getDb().tasks.filter(t => t.department_id === department_id && (t.status === "in_progress" || t.status === "pending"));
        const loadMap = new Map<string, number>();
        activeUsers.forEach(u => loadMap.set(u.id, 0));
        deptTasks.forEach(t => {
          if (t.assigned_user_id && loadMap.has(t.assigned_user_id)) {
            loadMap.set(t.assigned_user_id, loadMap.get(t.assigned_user_id)! + 1);
          }
        });

        let minUser = activeUsers[0]!.id;
        let minLoad = loadMap.get(minUser)!;
        for (const [uid, load] of loadMap.entries()) {
          if (load < minLoad) {
            minLoad = load;
            minUser = uid;
          }
        }
        assigned_user_id = minUser;
      }
    }

    const newTask: AppTask = {
      id: taskId,
      company_id,
      title: task_title,
      description: task_description,
      source_file_id: params.source_file_id,
      source_file_name: params.source,
      source_sheet_name: params.sheet,
      source_row_key: params.source_row_key,
      department_id,
      assigned_user_id,
      priority,
      status: assigned_user_id ? "pending" : "unassigned",
      created_by: params.created_by,
      ai_classification,
      ai_confidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    await dataSourceService.insert("tasks", newTask);

    // Notify assignee if determined
    if (assigned_user_id) {
      await notificationService.create({
        user_id: assigned_user_id,
        department_id: null,
        task_id: taskId,
        title: "New AI Task Assigned",
        message: `You have been automatically assigned: ${task_title}`,
        type: "task_assigned",
        company_id
      });
    } else if (department_id) {
      // Notify department
      await notificationService.create({
        user_id: null,
        department_id,
        task_id: taskId,
        title: "New Unassigned Task",
        message: `A new task requires assignment in your department: ${task_title}`,
        type: "task_assigned",
        company_id
      });
    } else {
      // Notify admins
      await notificationService.create({
        user_id: null,
        department_id: null,
        task_id: taskId,
        title: "Unclassified Task",
        message: `AI Confidence too low OR configured for Manual Review. Please review: ${task_title}`,
        type: "system_alert",
        company_id
      });
    }

    return newTask;
  },

  async classifyEmailContent(emailContent: string, createdBy: string, company_id: string): Promise<AppTask | null> {
    const aiDecision = await classifyRowFn({
      data: {
        source: "Email Inbox",
        sheet: "Inbound",
        columns: ["Body"],
        row: { Body: emailContent },
        departments: getDb().departments.filter(d => d.active).map(d => d.name),
        rules: []
      }
    });

    if (!aiDecision.is_actionable) return null;

    const matchDept = getDb().departments.find(d => d.name.toLowerCase() === aiDecision.department.toLowerCase());
    let department_id = matchDept ? matchDept.id : null;
    if (aiDecision.confidence < 0.70) department_id = null;

    const taskId = uid("tsk");
    let assigned_user_id: string | null = null;
    if (department_id) {
      const activeUsers = getDb().users.filter(u => u.active && u.department_id === department_id && u.company_id === company_id);
      if (activeUsers.length === 1) assigned_user_id = activeUsers[0]!.id;
    }

    const newTask: AppTask = {
      id: taskId,
      company_id,
      title: aiDecision.task_title,
      description: `Inbound Email:\n\n${emailContent}\n\nAI Notes:\n${aiDecision.task_description}`,
      source_file_id: null,
      source_file_name: null,
      source_sheet_name: null,
      source_row_key: null,
      department_id,
      assigned_user_id,
      priority: (aiDecision.priority === "critical" ? "urgent" : aiDecision.priority) as TaskPriority,
      status: assigned_user_id ? "pending" : "unassigned",
      created_by: createdBy,
      ai_classification: true,
      ai_confidence: aiDecision.confidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    await dataSourceService.insert("tasks", newTask);
    return newTask;
  },

  // Legacy createTask mapping for internal system updates retaining backward compat
  async createTask(params: {
    title: string;
    description: string;
    source_file_id: string | null;
    source_file_name: string | null;
    source_sheet_name: string | null;
    source_row_key: string | null;
    created_by: string;
    explicit_department_id?: string;
  }): Promise<AppTask> {
    const task: AppTask = {
      id: uid("tsk"),
      company_id: getDb().users.find(u => u.id === params.created_by)?.company_id || "demo",
      title: params.title,
      description: params.description,
      source_file_id: params.source_file_id,
      source_file_name: params.source_file_name,
      source_sheet_name: params.source_sheet_name,
      source_row_key: params.source_row_key,
      department_id: params.explicit_department_id || null,
      assigned_user_id: null,
      priority: "medium",
      status: "unassigned",
      ai_classification: false,
      ai_confidence: 1.0,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    const saved = await dataSourceService.insert("tasks", task) as AppTask;
    realtime.publish({ type: "task.created", task: saved });
    return saved;
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, actorId: string): Promise<void> {
    const task = getDb().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const patch: Partial<AppTask> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed") {
      patch.completed_at = new Date().toISOString();
    }

    await dataSourceService.update("tasks", taskId, patch);

    await activityService.log({
      user_id: actorId,
      action: "task.status_updated",
      entity_type: "task",
      entity_id: taskId,
      description: `Task status changed to ${status}`,
    });

    realtime.publish({ type: "task.updated", task: { ...task, ...patch } });
  },

  async assignTask(taskId: string, assigneeId: string, actorId: string): Promise<void> {
    const task = getDb().tasks.find((t) => t.id === taskId);
    if (!task) return;

    await dataSourceService.update("tasks", taskId, {
      assigned_user_id: assigneeId,
      status: task.status === "unassigned" ? "pending" : task.status,
      updated_at: new Date().toISOString(),
    });

    await activityService.log({
      user_id: actorId,
      action: "task.assigned",
      entity_type: "task",
      entity_id: taskId,
      description: `Task assigned to user ${assigneeId}`,
    });

    await notificationService.create({
      user_id: assigneeId,
      department_id: task.department_id,
      type: "task_assigned",
      title: "Task Assigned to You",
      message: `You have been assigned to: ${task.title}`,
      task_id: task.id,
      company_id: task.company_id
    });

    realtime.publish({ type: "task.updated", task: { ...task, assigned_user_id: assigneeId } });
  },
};
