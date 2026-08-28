import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Users, Plus, ShieldCheck, Mail, Network, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { useDatabase, uid } from "@/lib/store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { dataSourceService } from "@/lib/data/dataSource";
import type { AppRole } from "@/lib/types";
import { createDatabaseAuthUserFn } from "@/lib/services/driveFunctions";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const user = useSession();
  const db = useDatabase();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [deptId, setDeptId] = useState(db.departments[0]?.id || "");
  const [role, setRole] = useState<AppRole>("department_user");
  const [rolesResp, setRolesResp] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");

  if (user === undefined) return null;
  if (user === null) return <Navigate to="/" replace />;
  if (user.role !== "super_admin" && user.role !== "company_admin" && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;

  async function handlePreAuthorizeUser(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg("");
    try {
      if (password) {
        const res = await createDatabaseAuthUserFn({ data: { email, password } });
        if (!res.success) throw new Error(res.error || "Failed to create local password login.");
      }

      await dataSourceService.insert("users", {
        id: uid("usr"),
        email,
        name,
        company_id: user.company_id, // Pin to current user's company (unless superadmin doing impersonation, but this suffices MVP)
        department_id: deptId,
        role,
        roles_responsibilities: rolesResp,
        remarks: remarks,
        active: true,
        created_at: new Date().toISOString(),
      } as any);

      toast.success(
        password
          ? "User created with local password!"
          : "User pre-authorized! They can now log in via Google.",
      );
      setOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      setRolesResp("");
      setRemarks("");
    } catch (e: any) {
      toast.error(e.message);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("department_user");
  const [updateLoading, setUpdateLoading] = useState(false);

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setUpdateLoading(true);
    try {
      await dataSourceService.update("users", editingUser.id, {
        name: editName,
        department_id: editDeptId,
        role: editRole
      });
      toast.success("User updated successfully");
      setEditingUser(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdateLoading(false);
    }
  }

  async function toggleActiveStatus(appUser: any) {
    try {
      await dataSourceService.update("users", appUser.id, {
        active: !appUser.active
      });
      toast.success(appUser.active ? "User deactivated" : "User activated");
    } catch (e: any) {
      toast.error("Failed to update user status");
    }
  }

  const visibleUsers =
    user.role === "super_admin"
      ? db.users
      : db.users.filter((u) => u.company_id === user.company_id);

  return (
    <AppShell
      title="Users Management"
      subtitle="Pre-authorize Google Accounts for platform access"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" /> Pre-authorize User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pre-authorize Google Login</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePreAuthorizeUser} className="space-y-4">
              <p className="text-xs text-muted-foreground my-2">
                No password required. The user will be authenticated natively by Google when they
                click "Continue with Google". This will allow them into the application.
              </p>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Google Email Address</Label>
                <Input
                  type="email"
                  required
                  placeholder="john@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Local Password (Optional Dev Bypass)</Label>
                <Input
                  type="password"
                  placeholder="Leave blank for Google only"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                >
                  {db.departments
                    .filter((d) => user.role === "super_admin" || d.company_id === user.company_id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                >
                  <option value="department_user">Department User</option>
                  <option value="company_admin">Company Administrator</option>
                  {user.role === "super_admin" && (
                    <option value="super_admin">Super Administrator</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Roles & Responsibilities (For AI Assignment)</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g. Handles overdue invoices, client follow-ups"
                  value={rolesResp}
                  onChange={(e) => setRolesResp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks / Rules</Label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g. Only assign critical tasks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              {errorMsg && (
                <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 break-words">
                  {errorMsg}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Authorizing..." : "Authorize Email"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {visibleUsers.map((appUser) => {
          const dept = db.departments.find((d) => d.id === appUser.department_id);
          return (
            <div
              key={appUser.id}
              className="border bg-card rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    {appUser.name}
                    {appUser.role === "admin" && <ShieldCheck className="size-4 text-orange-500" />}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" /> {appUser.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Network className="size-3" /> {dept?.name || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingUser(appUser);
                    setEditName(appUser.name || "");
                    setEditDeptId(appUser.department_id || "");
                    setEditRole(appUser.role);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant={appUser.active ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleActiveStatus(appUser)}
                >
                  {appUser.active ? "Deactivate" : "Activate"}
                </Button>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ml-2 ${appUser.active ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted'}`}>
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

      <div className="mt-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 rounded-xl p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-200">
          <Shield className="size-4" /> Google SSO Integrity
        </h3>
        <p className="text-sm text-amber-700/80 dark:text-amber-300">
          Authentication is strictly managed via Google OAuth. You do not create passwords for
          users. By adding a user here, you are pre-authorizing their specific Google Email address.
          If their address isn't listed here and active, they will be blocked from accessing the
          platform.
        </p>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {db.departments
                    .filter((d) => user.role === "super_admin" || d.company_id === user.company_id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as AppRole)}
                >
                  <option value="department_user">Department User</option>
                  <option value="company_admin">Company Administrator</option>
                  {user.role === "super_admin" && (
                    <option value="super_admin">Super Administrator</option>
                  )}
                </select>
              </div>
              <Button type="submit" disabled={updateLoading} className="w-full">
                {updateLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
