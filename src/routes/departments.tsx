import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/departments")({
    component: DepartmentsPage,
});

function DepartmentsPage() {
    const user = useSession();
    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return (
        <AppShell
            title="Departments"
            subtitle="Manage organizational divisions and workflow mapping queues"
            actions={<Button><Plus className="mr-2 size-4" /> Add Department</Button>}
        >
            <div className="flex flex-col items-center justify-center py-20 border rounded-xl bg-card border-dashed">
                <Network className="size-10 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium">Departments Management</h2>
                <p className="text-muted-foreground mt-1">Define active departments to map operations logic against.</p>
            </div>
        </AppShell>
    );
}
