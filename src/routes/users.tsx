import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/users")({
    component: UsersPage,
});

function UsersPage() {
    const user = useSession();
    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return (
        <AppShell
            title="Users"
            subtitle="Manage internal accounts and role assignment"
            actions={<Button><Plus className="mr-2 size-4" /> Add User</Button>}
        >
            <div className="flex flex-col items-center justify-center py-20 border rounded-xl bg-card border-dashed">
                <Users className="size-10 text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium">Platform Users</h2>
                <p className="text-muted-foreground mt-1">Manage platform accounts associated with specific departments.</p>
            </div>
        </AppShell>
    );
}
