import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Users, Plus, ShieldCheck, Mail, Network, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { useDatabase } from "@/lib/store";
import { createUserFn } from "@/lib/services/adminFunctions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/users")({
    component: UsersPage,
});

function UsersPage() {
    const user = useSession();
    const db = useDatabase();

    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("password123");
    const [deptId, setDeptId] = useState(db.departments[0]?.id || "");
    const [role, setRole] = useState<"admin" | "department_user">("department_user");
    const [loading, setLoading] = useState(false);

    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createUserFn({
                email,
                name,
                password,
                department_id: deptId,
                role
            });

            if (res.success) {
                toast.success("User created inside Supabase Auth & bound to App Users!");
                setOpen(false);
            } else {
                toast.error(res.error || "Failed to create user");
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AppShell
            title="Users & Departments"
            subtitle="Manage internal accounts and role assignment"
            actions={
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 size-4" /> Add User</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input required value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Initial Password (Encrypted by Supabase)</Label>
                                <Input required value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={deptId}
                                    onChange={e => setDeptId(e.target.value)}
                                >
                                    {db.departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={role}
                                    onChange={e => setRole(e.target.value as any)}
                                >
                                    <option value="department_user">Department User</option>
                                    <option value="admin">System Administrator</option>
                                </select>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Creating..." : "Create User"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            }
        >
            <div className="grid grid-cols-1 gap-4">
                {db.users.map((appUser) => {
                    const dept = db.departments.find(d => d.id === appUser.department_id);
                    return (
                        <div key={appUser.id} className="border bg-card rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="size-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                        {appUser.name}
                                        {appUser.role === 'admin' && <ShieldCheck className="size-4 text-orange-500" />}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1"><Mail className="size-3" /> {appUser.email}</span>
                                        <span className="flex items-center gap-1"><Network className="size-3" /> {dept?.name || "Unassigned"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {appUser.active ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {db.users.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        No users mapped in database yet. Add one above!
                    </div>
                )}
            </div>

            <div className="mt-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 rounded-xl p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-200">
                    <Key className="size-4" /> Password Security Note
                </h3>
                <p className="text-sm text-blue-700/80 dark:text-blue-300">
                    Passwords are irreversibly hashed and managed by the Supabase Auth Core layer.
                    They cannot be viewed after creation. If a user loses their password, an Administrator can reset it directly in the Supabase Dashboard, or you can implement a standard email-based Magic Link flow.
                </p>
            </div>
        </AppShell>
    );
}
