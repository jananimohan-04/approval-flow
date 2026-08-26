import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useSession } from "@/hooks/useSession";
import { approvalService } from "@/lib/services/approvalService";
import { useDatabase } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vecta Logic Vehicle Approval" },
      {
        name: "description",
        content:
          "Role-based dashboard with pending, approved and rejected vehicle approvals plus recent gate activity.",
      },
      { property: "og:title", content: "Dashboard — Vecta Logic Vehicle Approval" },
      {
        property: "og:description",
        content: "Live counts of pending, approved and rejected vehicle entries by role.",
      },
    ],
  }),
  component: DashboardPage,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Truck;
  tone: string;
}) {
  return (
    <div className="rounded-sm border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const user = useSession();
  const db = useDatabase();
  if (!user) return <AppShell title="Dashboard">{null}</AppShell>;

  const rows = approvalService.rows();
  const scoped =
    user.role === "approver"
      ? rows.filter((r) => r.request.approver_id === user.id)
      : user.role === "data_entry"
        ? rows.filter((r) => r.entry.created_by === user.id)
        : rows;

  const pending = scoped.filter((r) => r.request.status === "pending");
  const approved = scoped.filter((r) => r.request.status === "approved");
  const rejected = scoped.filter((r) => r.request.status === "rejected");

  const activity = [...db.activity_logs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  return (
    <AppShell
      title={`Good day, ${user.name}`}
      subtitle={`${ROLE_LABELS[user.role]} · ${user.branch} · ${user.department}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total entries" value={scoped.length} icon={Truck} tone="text-primary" />
        <Stat label="Pending" value={pending.length} icon={Clock} tone="text-warning" />
        <Stat label="Approved" value={approved.length} icon={CheckCircle2} tone="text-success" />
        <Stat label="Rejected" value={rejected.length} icon={XCircle} tone="text-danger" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-sm border bg-card lg:col-span-2">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.06em]">
              {user.role === "approver" ? "Awaiting your decision" : "Recent requests"}
            </h2>
            <Link to="/approvals" className="label-mono text-primary hover:underline">
              View all
            </Link>
          </header>
          <div className="divide-y">
            {(pending.length ? pending : scoped).slice(0, 6).map((row) => (
              <div key={row.request.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">
                    {row.entry.vehicle_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.entry.company_name} · {row.entry.vehicle_type} · {row.entry.location}
                  </p>
                </div>
                <StatusBadge status={row.request.status} />
              </div>
            ))}
            {scoped.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No vehicle entries yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-sm border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.06em]">
              Activity
            </h2>
          </header>
          <ol className="divide-y">
            {activity.map((log) => (
              <li key={log.id} className="px-4 py-2.5">
                <p className="text-sm">{log.description}</p>
                <p className="label-mono mt-0.5">
                  {log.action} · {new Date(log.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
