import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Activity } from "lucide-react";
import { useDatabase } from "@/lib/store";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/activity-logs")({
    component: ActivityLogsPage,
});

function ActivityLogsPage() {
    const db = useDatabase();
    const user = useSession();

    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return (
        <AppShell
            title="Activity Logs"
            subtitle="Complete system audit trail for security compliance"
        >
            <div className="border bg-card rounded-xl shadow-sm max-h-[80vh] overflow-auto">
                <div className="divide-y p-2">
                    {db.activity_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(log => (
                        <div key={log.id} className="p-3 px-4 hover:bg-muted/30">
                            <p className="font-medium text-sm">{(log.metadata?.["description"] as string) || "System action"}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                <span>·</span>
                                <span className="font-mono">{log.action}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppShell>
    );
}
