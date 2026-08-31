import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LayoutDashboard, Database, CheckSquare, Clock, Users, ArrowRight, Activity, Bot } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useSession } from "@/hooks/useSession";
import { useDatabase } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useSession();
  const db = useDatabase();

  if (user === undefined) return null;
  if (user === null) return <Navigate to="/" replace />;

  const isAdmin = user.role === "admin" || user.role === "super_admin" || user.role === "company_admin";

  const companyTasks = db.tasks.filter((t) => t.company_id === user.company_id);
  const deptTasks = isAdmin ? companyTasks : companyTasks.filter((t) => t.department_id === user.department_id);
  const pending = deptTasks.filter((t) => t.status === "pending" || t.status === "unassigned");
  const inProgress = deptTasks.filter((t) => t.status === "in_progress");
  const completed = deptTasks.filter((t) => t.status === "completed");

  const recentTasks = [...deptTasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const userDeptName = db.departments.find(d => d.id === user.department_id)?.name || "Unassigned";

  return (
    <AppShell
      title="Dashboard"
      subtitle={isAdmin ? "System Overview" : `${userDeptName} Department`}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">

        {isAdmin && (
          <div className="rounded-xl border bg-card p-6 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-muted-foreground">Connected Sources</h3>
              <Database className="size-5 text-emerald-600" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-display font-medium">{db.data_sources.filter(d => d.company_id === user.company_id).length}</p>
              <p className="text-sm text-muted-foreground mt-1">Active Excel sheets</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-card p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-muted-foreground">Total Tasks</h3>
            <CheckSquare className="size-5 text-blue-600" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-medium">{deptTasks.length}</p>
            <p className="text-sm text-muted-foreground mt-1">In {isAdmin ? "all departments" : userDeptName}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-muted-foreground">Action Required</h3>
            <Activity className="size-5 text-orange-600" />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-display font-medium">{pending.length + inProgress.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Pending & In Progress</p>
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-xl border bg-card p-6 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-muted-foreground">Departments</h3>
              <Users className="size-5 text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-display font-medium">{db.departments.filter(d => d.company_id === user.company_id).length}</p>
              <p className="text-sm text-muted-foreground mt-1">{db.users.filter(u => u.company_id === user.company_id).length} Active Users</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        {/* Recent Tasks */}
        <div className="border bg-card rounded-xl shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4 flex items-center justify-between bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="size-4" /> Recent Activity
            </h3>
          </div>

          <div className="p-0">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No recent tasks found.</p>
            ) : (
              <div className="divide-y">
                {recentTasks.map((t) => (
                  <div key={t.id} className="p-4 px-6 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm truncate pr-4">{t.title}</p>
                      <span className={`text-[10px] uppercase font-bold shrink-0 ${t.priority === 'high' || t.priority === 'urgent' ? 'text-orange-600' : 'text-muted-foreground'
                        }`}>{t.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{new Date(t.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {isAdmin && <span>· {db.departments.find(d => d.id === t.department_id)?.name}</span>}
                      {t.ai_classification && (
                        <span className="flex items-center gap-1 text-primary">
                          <Bot className="size-3" /> AI Assigned
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Quick Stats (Admin) or Profile (Dept User) */}
        {isAdmin ? (
          <div className="border bg-card rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="border-b px-6 py-4 bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Bot className="size-4" /> Argus CEO Summary
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                <span className="text-sm font-medium">Automatic Classifications</span>
                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">
                  {db.tasks.filter(t => t.ai_classification).length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                <span className="text-sm font-medium">Unclassified Items (Review)</span>
                <span className="font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded text-sm">
                  {db.tasks.filter(t => !t.department_id).length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                <span className="text-sm font-medium">Avg AI Confidence</span>
                <span className="font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded text-sm">
                  {db.tasks.filter(t => t.ai_classification && t.ai_confidence).length > 0
                    ? Math.round(db.tasks.filter(t => t.ai_classification).reduce((acc, t) => acc + (t.ai_confidence || 0), 0) / db.tasks.filter(t => t.ai_classification).length * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-surface">
                <span className="text-sm font-medium">Active Mapping Rules</span>
                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">
                  {db.ai_rules.filter(r => r.is_active && (user.role === "super_admin" || r.company_id === user.company_id)).length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Argus CEO continuously monitors connected Google Drive sheets and routes detected data items to specific departments based on defined keywords and fallback inference.
              </p>
            </div>
          </div>
        ) : (
          <div className="border bg-card rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="border-b px-6 py-4 bg-muted/20">
              <h3 className="font-semibold">Department Assignment</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                You are assigned to the <strong>{userDeptName}</strong> department queue. You will receive notifications when new data sources are analyzed and classified to this department.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-success uppercase text-xs tracking-wider">Active</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">My Pending Items</span>
                  <span className="font-medium">{pending.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
