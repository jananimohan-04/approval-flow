import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Network, Plus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { useDatabase } from "@/lib/store";
import { dataSourceService } from "@/lib/data/dataSource";
import { toast } from "sonner";
import { uid } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/departments")({
    component: DepartmentsPage,
});

function DepartmentsPage() {
    const user = useSession();
    const db = useDatabase();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

    async function handleAddDept(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await dataSourceService.insert("departments", {
                id: uid("dept"),
                name,
                description,
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            toast.success(`Department "${name}" created!`);
            setName("");
            setDescription("");
            setOpen(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to create department");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(deptId: string, deptName: string) {
        if (!confirm(`Delete department "${deptName}"? Users in this department will be unassigned.`)) return;
        try {
            await dataSourceService.remove("departments", deptId);
            toast.success(`Department "${deptName}" deleted.`);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete");
        }
    }

    return (
        <AppShell
            title="Departments"
            subtitle="Manage organizational divisions and workflow mapping queues"
            actions={
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 size-4" /> Add Department</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Department</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddDept} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Department Name</Label>
                                <Input placeholder="e.g. Human Resources" required value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input placeholder="e.g. HR and Payroll" value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Creating..." : "Create Department"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            }
        >
            {db.departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-xl bg-card border-dashed">
                    <Network className="size-10 text-muted-foreground/30 mb-4" />
                    <h2 className="text-lg font-medium">No Departments Yet</h2>
                    <p className="text-muted-foreground mt-1">Click "Add Department" to create your first one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {db.departments.map((dept) => {
                        const deptUsers = db.users.filter(u => u.department_id === dept.id);
                        const deptTasks = db.tasks.filter(t => t.department_id === dept.id);
                        return (
                            <div key={dept.id} className="border bg-card rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Network className="size-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{dept.name}</h3>
                                            <p className="text-xs text-muted-foreground">{dept.description || "No description"}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(dept.id, dept.name)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
                                    <span className="flex items-center gap-1"><Users className="size-3.5" /> {deptUsers.length} users</span>
                                    <span>{deptTasks.length} tasks</span>
                                    <span className={`ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${dept.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {dept.active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </AppShell>
    );
}
