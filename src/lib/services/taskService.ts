import { getDb, uid } from "../store";
import { dataSourceService } from "../data/dataSource";
import { activityService } from "./activityService";
import { notificationService } from "./notificationService";
import { realtime } from "./realtime";
import { classifyRowFn } from "./aiFunctions";
import type { AppTask, TaskPriority, TaskStatus, AiRule, User } from "../types";

export const taskService = {
  checkAdminRules(searchString: string, sourceFileName: string): { department_id: string; priority: TaskPriority; confidence: number } | null {
    const rules = getDb().ai_rules.filter(r => r.active);
    const normalized = searchString.toLowerCase();

    for (const rule of rules) {
      if (rule.source_conditions && sourceFileName.includes(rule.source_conditions)) {
        return { department_id: rule.target_department_id!, priority: rule.priority, confidence: 1.0 };
      }
      const keywords = rule.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
      for (const kw of keywords) {
        if (normalized.includes(kw)) {
          return { department_id: rule.target_department_id!, priority: rule.priority, confidence: 1.0 };
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
  }): Promise<AppTask | null> {
    const explicitRule = this.checkAdminRules(JSON.stringify(params.row), params.source);

    let department_id: string | null = null;
    let priority: TaskPriority = "medium";
    let aiClassified = false;
    let aiConfidence = 1.0;
    let task_title = "Data update";
    let task_description = `Auto-imported details from ${params.source} (${params.sheet}).\n\nRow Details: \n${JSON.stringify(params.row, null, 2)}`;
    let is_actionable = true;

    if (explicitRule) {
      // Rule matched implicitly actionable and routed
      department_id = explicitRule.department_id;
      priority = explicitRule.priority;
    } else {
      aiClassified = true;
      const deptNames = getDb().departments.filter(d => d.active).map(d => d.name);
      const ruleContext = getDb().ai_rules.filter(r => r.active).map(r => ({
        keyword: r.keywords,
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

    // Auto-assignment behavior mapping
    let assigned_user_id: string | null = null;
    if (department_id) {
      const activeUsers = getDb().users.filter(u => u.active && u.department_id === department_id);
      if (activeUsers.length === 1) {
        assigned_user_id = activeUsers[0]!.id;
      } else if (activeUsers.length > 1) {
        // Assign to least loaded stringently
        const deptTasks = getDb().tasks.filter(t => t.department_id === department_id && (t.status === "in_progress" || t.status === "pending"));
        const userLoad = activeUsers.map(u => ({ id: u.id, load: deptTasks.filter(t => t.assigned_user_id === u.id).length }));
        userLoad.sort((a, b) => a.load - b.load);
        assigned_user_id = userLoad[0]!.id;
      }
    }

    const task: AppTask = {
      id: taskId,
      title: task_title,
      description: task_description,
      source_file_id: params.source_file_id,
      source_file_name: params.source,
      source_sheet_name: params.sheet,
      source_row_key: params.source_row_key,
      department_id: department_id,
      assigned_user_id,
      priority,
      status: assigned_user_id ? "pending" : "unassigned",
      ai_classification: aiClassified,
      ai_confidence: aiConfidence,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    const saved = await dataSourceService.insert("tasks", task) as AppTask;

    await activityService.log({
      user_id: params.created_by === "system" ? null : params.created_by,
      action: "task.created",
      entity_type: "task",
      entity_id: saved.id,
      description: `Task created: ${saved.title}`,
    });

    realtime.publish({ type: "task.created", task: saved });

    if (assigned_user_id) {
      await notificationService.create({
        user_id: assigned_user_id,
        department_id: department_id,
        type: "task_assigned",
        title: "New Task Assigned to You",
        message: `A new AI routed task "${saved.title}" requires your attention.`,
        task_id: saved.id,
      });
    } else if (department_id) {
      const deptUsers = getDb().users.filter((u) => u.department_id === department_id && u.active);
      for (const u of deptUsers) {
        await notificationService.create({
          user_id: u.id,
          department_id: department_id,
          type: "task_assigned",
          title: "New Department Task",
          message: `A new task in your queue requires assignment.`,
          task_id: saved.id,
        });
      }
    }

    return saved;
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
    });

    realtime.publish({ type: "task.updated", task: { ...task, assigned_user_id: assigneeId } });
  },
};
