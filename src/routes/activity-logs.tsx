import { useState, useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import {
    Activity, User, Building2, Search, Filter, Clock,
    LogIn, LogOut, FileSpreadsheet, Shield, Bell, CheckCircle2,
    Settings, FolderOpen, Trash2, RefreshCw, Bot
} from "lucide-react";
import { useDatabase } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { activityService } from "@/lib/services/activityService";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/activity-logs")({
    component: ActivityLogsPage,
});

// Map action types to icons and colors
function getActionMeta(action: string): { icon: typeof Activity; color: string; label: string } {
    if (action.startsWith("auth.login")) return { icon: LogIn, color: "text-emerald-500", label: "Login" };
    if (action.startsWith("auth.logout")) return { icon: LogOut, color: "text-amber-500", label: "Logout" };
    if (action.startsWith("auth.")) return { icon: Shield, color: "text-blue-500", label: "Auth" };
    if (action.startsWith("task.created")) return { icon: CheckCircle2, color: "text-blue-500", label: "Task Created" };
    if (action.startsWith("task.status")) return { icon: RefreshCw, color: "text-purple-500", label: "Task Updated" };
    if (action.startsWith("task.")) return { icon: CheckCircle2, color: "text-indigo-500", label: "Task" };
    if (action.startsWith("drive.connected")) return { icon: FolderOpen, color: "text-emerald-600", label: "Drive Connected" };
    if (action.startsWith("drive.disconnected")) return { icon: Trash2, color: "text-red-500", label: "Drive Disconnected" };
    if (action.startsWith("drive.file_monitoring")) return { icon: FileSpreadsheet, color: "text-teal-500", label: "Data Source" };
    if (action.startsWith("drive.folder")) return { icon: FolderOpen, color: "text-cyan-500", label: "Drive Folder" };
    if (action.startsWith("drive.")) return { icon: FolderOpen, color: "text-blue-400", label: "Drive" };
    if (action.startsWith("notification.")) return { icon: Bell, color: "text-yellow-500", label: "Notification" };
    if (action.startsWith("ai.") || action.startsWith("rule.")) return { icon: Bot, color: "text-violet-500", label: "AI Rule" };
    if (action.startsWith("settings.") || action.startsWith("config.")) return { icon: Settings, color: "text-gray-500", label: "Settings" };
    if (action.startsWith("user.") || action.startsWith("department.")) return { icon: User, color: "text-sky-500", label: "User Mgmt" };
    return { icon: Activity, color: "text-muted-foreground", label: action };
}

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

function ActivityLogsPage() {
    const db = useDatabase();
    const user = useSession();
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [userFilter, setUserFilter] = useState("all");
    const [companyFilter, setCompanyFilter] = useState("all");

    if (user === undefined) return null;
    if (user === null) return <Navigate to="/" replace />;
    if (user.role !== "admin" && user.role !== "company_admin" && user.role !== "super_admin") return <Navigate to="/dashboard" replace />;

    const isSuperAdmin = user.role === "super_admin";

    // Get role-filtered logs
    const allLogs = activityService.getFilteredLogs(user.id);

    // Get unique action types for filter dropdown
    const actionTypes = useMemo(() => {
        const types = new Set(allLogs.map(l => {
            const parts = l.action.split(".");
            return parts[0] || l.action;
        }));
        return Array.from(types).sort();
    }, [allLogs]);

    // Get users visible to this admin
    const visibleUsers = useMemo(() => {
        if (isSuperAdmin) return db.users;
        return db.users.filter(u => u.company_id === user.company_id);
    }, [db.users, user, isSuperAdmin]);

    // Get companies (only for super admin)
    const companies = useMemo(() => {
        if (!isSuperAdmin) return [];
        return db.companies;
    }, [db.companies, isSuperAdmin]);

    // Apply filters
    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            // Search filter
            if (searchQuery) {
                const desc = ((log.metadata?.["description"] as string) || "").toLowerCase();
                const action = log.action.toLowerCase();
                const q = searchQuery.toLowerCase();
                if (!desc.includes(q) && !action.includes(q)) return false;
            }

            // Action category filter
            if (actionFilter !== "all") {
                if (!log.action.startsWith(actionFilter)) return false;
            }

            // User filter
            if (userFilter !== "all") {
                if (log.user_id !== userFilter) return false;
            }

            // Company filter (super admin only)
            if (companyFilter !== "all") {
                if (log.company_id !== companyFilter) return false;
            }

            return true;
        });
    }, [allLogs, searchQuery, actionFilter, userFilter, companyFilter]);

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: Record<string, typeof filteredLogs> = {};
        for (const log of filteredLogs) {
            const dateKey = new Date(log.created_at).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey]!.push(log);
        }
        return groups;
    }, [filteredLogs]);

    return (
        <AppShell
            title="Activity Logs"
            subtitle={isSuperAdmin
                ? "Complete system audit trail across all companies"
                : "Activity audit trail for your organization"
            }
        >
            <div className="space-y-4 max-w-5xl">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border bg-card rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Total Activities</p>
                        <p className="text-2xl font-bold mt-1">{allLogs.length}</p>
                    </div>
                    <div className="border bg-card rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Today</p>
                        <p className="text-2xl font-bold mt-1">
                            {allLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
                        </p>
                    </div>
                    <div className="border bg-card rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Active Users</p>
                        <p className="text-2xl font-bold mt-1">
                            {new Set(allLogs.filter(l => l.user_id && l.user_id !== "system").map(l => l.user_id)).size}
                        </p>
                    </div>
                    <div className="border bg-card rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                            {isSuperAdmin ? "Companies" : "Departments"}
                        </p>
                        <p className="text-2xl font-bold mt-1">
                            {isSuperAdmin
                                ? new Set(allLogs.map(l => l.company_id).filter(Boolean)).size
                                : new Set(visibleUsers.map(u => u.department_id).filter(Boolean)).size
                            }
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="border bg-card rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Filters</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search activities..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <SelectValue placeholder="Action Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                {actionTypes.map(t => (
                                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {visibleUsers.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isSuperAdmin && (
                            <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="All Companies" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Companies</SelectItem>
                                    {companies.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="border bg-card rounded-xl shadow-sm overflow-hidden">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Activity className="mx-auto size-10 opacity-20 mb-3" />
                            <p className="font-medium">No activity logs found</p>
                            <p className="text-sm mt-1">Activities will appear here as users interact with the system.</p>
                        </div>
                    ) : (
                        <div>
                            {Object.entries(groupedLogs).map(([dateLabel, logs]) => (
                                <div key={dateLabel}>
                                    <div className="sticky top-0 bg-muted/50 backdrop-blur-sm px-4 py-2 border-b">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                            <Clock className="size-3" />
                                            {dateLabel}
                                            <Badge variant="secondary" className="ml-auto text-[10px]">{logs!.length} events</Badge>
                                        </p>
                                    </div>
                                    <div className="divide-y">
                                        {logs!.map(log => {
                                            const meta = getActionMeta(log.action);
                                            const IconComp = meta.icon;
                                            const userName = activityService.getUserName(log.user_id);
                                            const companyName = isSuperAdmin ? activityService.getCompanyName(log.company_id) : null;
                                            const description = (log.metadata?.["description"] as string) || log.action;

                                            return (
                                                <div key={log.id} className="flex items-start gap-3 p-3 px-4 hover:bg-muted/30 transition-colors">
                                                    <div className={`mt-0.5 flex-shrink-0 size-8 rounded-full flex items-center justify-center bg-muted/50 ${meta.color}`}>
                                                        <IconComp className="size-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium leading-snug">{description}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <User className="size-3" />
                                                                {userName}
                                                            </span>
                                                            {companyName && (
                                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Building2 className="size-3" />
                                                                    {companyName}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(log.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                            {meta.label}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {getRelativeTime(log.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {filteredLogs.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                        Showing {filteredLogs.length} of {allLogs.length} total activities
                    </p>
                )}
            </div>
        </AppShell>
    );
}
