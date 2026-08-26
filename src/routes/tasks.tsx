import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CheckSquare, Search, Plus, Filter, UserRound, Clock, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useDatabase } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { taskService } from "@/lib/services/taskService";
import type { TaskStatus, AppTask } from "@/lib/types";
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

    if (!user) return <Navigate to="/" replace />;

    // Department users only see their department's tasks, Admins see all
    const isDeptUser = user.role === "department_user";
    const userDepartmentId = user.department_id;
    const userDeptName = db.departments.find(d => d.id === user.department_id)?.name || "Unassigned";

    let filteredTasks = db.tasks.filter((t) => {
        if (isDeptUser && t.department_id !== userDepartmentId) return false;
        if (filterDepartment !== "all" && t.department_id !== filterDepartment) return false;
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        if (searchTerm) {
            if (!t.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !(t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))) {
                return false;
            }
        }
        return true;
    });

    filteredTasks = filteredTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const departments = db.departments;

    const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
        taskService.updateTaskStatus(taskId, status, user.id);
        toast.success(`Task marked as ${status.replace("_", " ")}`);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
            case "high": return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
            case "medium": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
            default: return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
            case "in_progress": return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300";
            case "pending": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
            case "unassigned": return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300";
            default: return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    return (
        <AppShell
            title="Tasks"
            subtitle={isDeptUser ? `${userDeptName} Queue` : "Global Operational Tasks"}
            actions={
                <Button><Plus className="size-4 mr-2" /> New Task</Button>
            }
        >
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

                <div className="flex gap-2">
                    {!isDeptUser && (
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="w-[160px]">
                                <Filter className="mr-2 size-4 text-muted-foreground" />
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[160px]">
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
                </div>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="text-center py-20 border rounded-xl bg-card/30">
                    <CheckSquare className="mx-auto size-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium">No tasks found</h3>
                    <p className="text-muted-foreground mt-1">
                        {isDeptUser ? "Your department queue is clear." : "No operational tasks match your filters."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredTasks.map((t) => (
                        <div key={t.id} className="group bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 md:items-center">

                            <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-[15px] truncate">{t.title}</h3>
                                    {t.ai_classification && (
                                        <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-sm">
                                            AI Assigned
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 max-w-3xl">
                                    {t.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground font-medium pt-1">
                                    <span className="flex items-center gap-1.5">
                                        <Database className="size-3.5 opacity-70" /> {t.source_file_name || "Manual Entry"}
                                    </span>
                                    {!isDeptUser && (
                                        <span className="flex items-center gap-1.5 text-foreground/70">
                                            <Network className="size-3.5 opacity-70" /> {db.departments.find(d => d.id === t.department_id)?.name}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="size-3.5 opacity-70" /> {new Date(t.created_at).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                    {t.assigned_user_id && (
                                        <span className="flex items-center gap-1.5 text-primary">
                                            <UserRound className="size-3.5 opacity-70" />
                                            {db.users.find(u => u.id === t.assigned_user_id)?.name || "Assigned"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col items-center justify-between gap-3 md:items-end shrink-0 md:w-[150px]">
                                <div className="flex gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(t.priority)}`}>
                                        {t.priority}
                                    </span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(t.status)}`}>
                                        {t.status.replace("_", " ")}
                                    </span>
                                </div>

                                <Select
                                    value={t.status}
                                    onValueChange={(val) => handleUpdateStatus(t.id, val as TaskStatus)}
                                >
                                    <SelectTrigger className="h-8 text-xs w-[130px]">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Mark Pending</SelectItem>
                                        <SelectItem value="in_progress">Start Work</SelectItem>
                                        <SelectItem value="completed">Complete</SelectItem>
                                    </SelectContent>
                                </Select>

                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppShell>
    );
}

// Used for icon reference inline
import { Database, Network } from "lucide-react";
