import { getDb, uid } from "../store";
import { dataSourceService } from "../data/dataSource";
import { activityService } from "./activityService";
import { notificationService } from "./notificationService";
import { realtime } from "./realtime";
import { classifyRowFn } from "./aiFunctions";
import type { AppTask, TaskPriority, TaskStatus, AiRule } from "../types";

export const taskService = {

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

    // Fetch all prompt instructions strictly scoped to this company
    const rules = getDb().ai_rules.filter(r => r.is_active && r.company_id === params.company_id);
    const customPrompts = rules.map(r => r.prompt_instruction);

    const deptNames = getDb().departments.filter(d => d.active).map(d => d.name);

    const aiDecision = await classifyRowFn({
      data: {
        source: params.source,
        sheet: params.sheet,
        columns: params.columns,
        row: params.row,
        departments: deptNames,
        customPrompts: customPrompts,
      }
    });

    if (!aiDecision.is_actionable) return null;

    let department_id: string | null = null;
    const matchDept = getDb().departments.find(d => d.name.toLowerCase() === aiDecision.department.toLowerCase());
    department_id = matchDept ? matchDept.id : null;
    if (aiDecision.confidence < 0.70) department_id = null;

    const priority: TaskPriority = (aiDecision.priority === "critical" ? "urgent" : (aiDecision.priority as TaskPriority));
    const task_title = aiDecision.task_title;
    const task_description = aiDecision.task_description;
    const taskId = uid("tsk");
    const ai_classification = true;
    const ai_confidence = aiDecision.confidence;
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
      classification_source: customPrompts.length > 0 ? "rule" : "ai",
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
        customPrompts: []
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
      classification_source: "ai",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    await dataSourceService.insert("tasks", newTask);
    return newTask;
  },

  // Legacy createTask mapping
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
      classification_source: "manual",
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };

    const saved = await dataSourceService.insert("tasks", task) as AppTask;
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
