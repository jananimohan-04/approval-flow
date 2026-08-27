import { useState, useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
    CheckSquare, Search, Plus, Filter, UserRound, Clock, AlertCircle, Database,
    Network, CheckCircle2, ChevronRight, FileSpreadsheet, Bot, User, Tag
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDatabase } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { taskService } from "@/lib/services/taskService";
import type { TaskStatus, AppTask, TaskPriority } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
    component: TasksPage,
});

function TasksPage() {
    const db = useDatabase();
    const user = useSession();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");

    // Detail Modal State
    const [viewTask, setViewTask] = useState<AppTask | null>(null);

    // Create Task Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: "", description: "", department_id: "", priority: "medium" as TaskPriority, assigned_user_id: ""
    });

    if (!user) return null; // Or route intercept handles it

    const isDeptUser = user.role === "department_user";
    const userDepartmentId = user.department_id;
    const userDeptName = db.departments.find(d => d.id === user.department_id)?.name || "Unassigned";

    // Filtering
    const filteredTasks = useMemo(() => {
        return db.tasks.filter((t) => {
            // Strict company isolation is enforced by the DB query. We shouldn't even have them, but check anyway:
            if (t.company_id !== user.company_id) return false;

            if (isDeptUser && t.department_id !== userDepartmentId) return false;

            if (filterDepartment !== "all" && t.department_id !== filterDepartment) return false;
            if (filterStatus !== "all" && t.status !== filterStatus) return false;
            if (filterPriority !== "all" && t.priority !== filterPriority) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(term);
                const matchDesc = t.description?.toLowerCase().includes(term);
                const matchFile = t.source_file_name?.toLowerCase().includes(term);
                if (!matchTitle && !matchDesc && !matchFile) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [db.tasks, user, isDeptUser, userDepartmentId, filterDepartment, filterStatus, filterPriority, searchTerm]);

    const stats = {
        total: filteredTasks.length,
        inProgress: filteredTasks.filter(t => t.status === "in_progress").length,
        unassigned: filteredTasks.filter(t => t.status === "unassigned").length,
        highCritical: filteredTasks.filter(t => (t.priority === "high" || t.priority === "urgent") && t.status !== "completed").length
    };

    const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
        try {
            await taskService.updateTaskStatus(taskId, status, user.id);
            toast.success(`Task marked as ${status.replace("_", " ")}`);
            if (viewTask && viewTask.id === taskId) {
                setViewTask(prev => prev ? { ...prev, status } : null);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to update status");
        }
    };

    const handleReassign = async (taskId: string, assigneeId: string) => {
        try {
            await taskService.assignTask(taskId, assigneeId, user.id);
            toast.success("Task reassigned successfully");
            if (viewTask && viewTask.id === taskId) {
                setViewTask(prev => prev ? { ...prev, assigned_user_id: assigneeId, status: prev.status === "unassigned" ? "pending" : prev.status } : null);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to reassign task");
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const params: any = {
                title: createForm.title,
                description: createForm.description,
                source_file_id: null,
                source_file_name: null,
                source_sheet_name: null,
                source_row_key: null,
                created_by: user.id,
            };
            if (createForm.department_id) {
                params.explicit_department_id = createForm.department_id;
            }
            await taskService.createTask(params);
            // Re-assign logic will happen via manual reassign or we could pass assigneUser
            toast.success("Task created manually");
            setIsCreateOpen(false);
            setCreateForm({ title: "", description: "", department_id: "", priority: "medium", assigned_user_id: "" });
        } catch (e: any) {
            toast.error(e.message || "Failed to create task");
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-100 text-red-800 border-red-200";
            case "high": return "bg-orange-100 text-orange-800 border-orange-200";
            case "medium": return "bg-blue-100 text-blue-800 border-blue-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };
    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "in_progress": return "bg-sky-100 text-sky-800 border-sky-200";
            case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
            case "unassigned": return "bg-rose-100 text-rose-800 border-rose-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    return (
        <AppShell
            title="Tasks"
            subtitle={isDeptUser ? `${userDeptName} Operational Workspace` : "Global Operational Tasks"}
            actions={
                <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4 mr-2" /> New Task</Button>
            }
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-center">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1"><Database className="size-4" /> Total</p>
                    <h4 className="text-2xl font-bold">{stats.total}</h4>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-center border-rose-100 bg-rose-50/30">
                    <p className="text-sm font-medium text-rose-800 flex items-center gap-1.5 mb-1"><AlertCircle className="size-4" /> Unassigned</p>
                    <h4 className="text-2xl font-bold text-rose-900">{stats.unassigned}</h4>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-center border-sky-100 bg-sky-50/30">
                    <p className="text-sm font-medium text-sky-800 flex items-center gap-1.5 mb-1"><Clock className="size-4" /> In Progress</p>
                    <h4 className="text-2xl font-bold text-sky-900">{stats.inProgress}</h4>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col justify-center border-orange-100 bg-orange-50/30">
                    <p className="text-sm font-medium text-orange-800 flex items-center gap-1.5 mb-1"><Tag className="size-4" /> Prioritized</p>
                    <h4 className="text-2xl font-bold text-orange-900">{stats.highCritical}</h4>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {!isDeptUser && (
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="w-[160px]">
                                <Filter className="mr-2 size-4 text-muted-foreground" />
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {db.departments.filter(d => d.active).map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <div className="text-center py-20 border rounded-xl bg-card/30 shadow-sm">
                    <CheckSquare className="mx-auto size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium">No tasks found</h3>
                    <p className="text-muted-foreground mt-1">
                        {isDeptUser ? "Your department queue is clear." : "No operational tasks match your filters."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredTasks.map((t) => (
                        <div key={t.id} className="group bg-card border rounded-lg p-4 shadow-sm transition-all flex flex-col md:flex-row gap-4 md:items-center">

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(t.priority)}`}>
                                        {t.priority}
                                    </span>
                                    <h3 className="font-semibold text-[15px] truncate cursor-pointer hover:underline text-foreground" onClick={() => setViewTask(t)}>
                                        {t.title}
                                    </h3>

                                    {t.classification_source === "rule" && <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 text-purple-700 hover:bg-purple-200 border-none"><Bot className="size-3 mr-1" /> Rule</Badge>}
                                    {t.classification_source === "ai" && <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"><Bot className="size-3 mr-1" /> AI</Badge>}
                                    {t.classification_source === "manual" && <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-700 hover:bg-slate-200 border-none"><User className="size-3 mr-1" /> Manual</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1 max-w-3xl mb-2">
                                    {t.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded">
                                        <Database className="size-3.5 opacity-70" /> {t.source_file_name || "Manual Entry"}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Network className="size-3.5 opacity-70" /> {db.departments.find(d => d.id === t.department_id)?.name || "Unassigned"}
                                    </span>
                                    {t.assigned_user_id ? (
                                        <span className="flex items-center gap-1.5 text-primary">
                                            <UserRound className="size-3.5 opacity-70" />
                                            {db.users.find(u => u.id === t.assigned_user_id)?.name || "Assigned"}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-rose-500">
                                            <UserRound className="size-3.5 opacity-70" /> Unassigned
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:w-[280px] shrink-0 justify-end">
                                <span className={`text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${getStatusColor(t.status)}`}>
                                    {t.status.replace("_", " ")}
                                </span>

                                <Button variant="ghost" size="sm" onClick={() => setViewTask(t)} className="text-xs shrink-0 group-hover:bg-primary/10">
                                    Details <ChevronRight className="size-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Task View Modal */}
            <Dialog open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
                {viewTask && (
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(viewTask.priority)}`}>
                                    {viewTask.priority}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(viewTask.status)}`}>
                                    {viewTask.status.replace("_", " ")}
                                </span>
                                {viewTask.classification_source && (
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
                                        Source: {viewTask.classification_source}
                                    </span>
                                )}
                            </div>
                            <DialogTitle className="text-xl">{viewTask.title}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            <div className="bg-muted/30 p-4 rounded-lg text-sm border font-mono whitespace-pre-wrap">
                                {viewTask.description || "No description provided."}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Department</p>
                                    <p className="flex items-center gap-1.5"><Network className="size-4 text-muted-foreground" /> {db.departments.find(d => d.id === viewTask.department_id)?.name || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Assignment</p>
                                    {viewTask.status !== "completed" && db.users.filter(u => u.active && u.department_id === viewTask.department_id).length > 0 ? (
                                        <Select
                                            value={viewTask.assigned_user_id || "unassigned"}
                                            onValueChange={(val) => {
                                                if (val !== "unassigned") handleReassign(viewTask.id, val);
                                            }}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Assign User..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {viewTask.assigned_user_id === null && <SelectItem value="unassigned">Unassigned</SelectItem>}
                                                {db.users.filter(u => u.active && u.company_id === user.company_id && u.department_id === viewTask.department_id).map(u => (
                                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="flex items-center gap-1.5">
                                            <UserRound className="size-4 text-muted-foreground" />
                                            {db.users.find(u => u.id === viewTask.assigned_user_id)?.name || "Unassigned"}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Source Document</p>
                                    <p className="flex items-center gap-1.5"><FileSpreadsheet className="size-4 text-muted-foreground" /> {viewTask.source_file_name || "Manual"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Created</p>
                                    <p className="flex items-center gap-1.5"><Clock className="size-4 text-muted-foreground" /> {new Date(viewTask.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 border-t pt-4">
                            <div className="flex w-full justify-between gap-3">
                                <Button variant="outline" onClick={() => setViewTask(null)}>Close</Button>
                                <div className="flex gap-2">
                                    {viewTask.status !== 'in_progress' && viewTask.status !== 'completed' && viewTask.assigned_user_id && (
                                        <Button variant="secondary" onClick={() => handleUpdateStatus(viewTask.id, "in_progress")}>
                                            Mark In Progress
                                        </Button>
                                    )}
                                    {viewTask.status !== 'completed' && (
                                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateStatus(viewTask.id, "completed")}>
                                            <CheckCircle2 className="size-4 mr-2" /> Complete Task
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* Create Task Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Manual Task</DialogTitle>
                        <DialogDescription>Add a new operational task to a department manually.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Follow up on manual review invoice" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select required value={createForm.department_id} onValueChange={v => setCreateForm({ ...createForm, department_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {db.departments.filter(d => d.active).map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={createForm.priority} onValueChange={(v: TaskPriority) => setCreateForm({ ...createForm, priority: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description / Details</Label>
                            <Textarea
                                required
                                className="h-32"
                                value={createForm.description}
                                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit">Create Task</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </AppShell>
    );
}
