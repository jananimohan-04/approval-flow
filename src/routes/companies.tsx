import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Database, Plus, Search, CheckCircle2, XCircle } from "lucide-react";
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
import { createDatabaseAuthUserFn } from "@/lib/services/driveFunctions";
import { GSTVerification } from "@/components/app/GSTVerification";

export const Route = createFileRoute("/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const user = useSession();
  const db = useDatabase();

  const [open, setOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addingUserTo, setAddingUserTo] = useState<string | null>(null);

  if (user === undefined) return null;
  if (user === null) return <Navigate to="/" replace />;
  if (user.role !== "super_admin") return <Navigate to="/dashboard" replace />;

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await dataSourceService.insert(
        "companies" as any,
        {
          id: crypto.randomUUID(),
          name,
          code: code.toUpperCase().replace(/\s/g, "_"),
          description,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      );

      toast.success("Tenant Company Created successfully!");
      setOpen(false);
      setName("");
      setCode("");
      setDescription("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredCompanies = db.companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell
      title="Multi-Tenant Configuration"
      subtitle="Manage client companies and organization siloes (Super Admin Only)"
      actions={
        <div className="flex gap-2">
          <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Search className="mr-2 size-4" /> Verify GST
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Verify GST Number</DialogTitle>
              </DialogHeader>
              <GSTVerification onVerified={() => setVerifyOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Register New Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    required
                    placeholder="Acme Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Code (Unique Identifier)</Label>
                  <Input
                    required
                    placeholder="ACME"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="Brief details about tenant..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Registering..." : "Register Company"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-6 max-w-sm">
        <Search className="size-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((co) => {
          const coUsers = db.users.filter((u) => u.company_id === co.id);
          const coAdmins = coUsers.filter((u) => u.role === "company_admin");
          return (
            <div
              key={co.id}
              className="border bg-card rounded-xl p-5 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{co.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{co.code}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const nextStatus = co.status === "active" ? "inactive" : "active";
                      await dataSourceService.update("companies" as any, co.id, {
                        status: nextStatus,
                      } as any);
                      toast.success(`Company ${nextStatus} successfully`);
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}
                  className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded cursor-pointer transition-colors hover:opacity-80 ${co.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                >
                  {co.status === "active" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {co.status}
                </button>
              </div>
              {co.description && <p className="text-sm text-muted-foreground">{co.description}</p>}
              <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3 mt-1">
                <span>
                  <strong>{coUsers.length}</strong> Total Provisioned Users
                </span>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    User Directory
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] uppercase font-bold"
                    onClick={() => setAddingUserTo(co.id)}
                  >
                    <Plus className="size-3 mr-1" /> Provision User
                  </Button>
                </div>
                {coUsers.length > 0 ? (
                  <div className="space-y-1">
                    {coUsers.map((u) => (
                      <div
                        key={u.id}
                        className={`text-xs border rounded p-2 flex flex-col gap-2 ${u.active ? "bg-slate-50 dark:bg-slate-900 border-border" : "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 opacity-75"}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{u.name}</span>
                            {!u.active && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded uppercase tracking-wider">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex justify-between items-center gap-2">
                          <span className="truncate">{u.email}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/30 px-1 rounded-sm border border-amber-200 dark:border-amber-800 hidden sm:inline-block">
                              [🔒 SSO]
                            </span>
                            <Button
                              variant={u.active ? "outline" : "default"}
                              size="sm"
                              className={`h-5 text-[10px] px-2 py-0 ${!u.active && "bg-red-600 hover:bg-red-700 text-white"}`}
                              onClick={async () => {
                                try {
                                  await dataSourceService.update("users" as any, u.id, {
                                    active: !u.active,
                                  } as any);
                                  toast.success(
                                    `User ${u.active ? "deactivated" : "activated"} successfully`,
                                  );
                                } catch (err: any) {
                                  toast.error(err.message);
                                }
                              }}
                            >
                              {u.active ? "Deactivate" : "Reactivate"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No users provisioned yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredCompanies.length === 0 && (
          <div className="col-span-full text-center p-8 text-muted-foreground">
            No companies found matching your search.
          </div>
        )}
      </div>
      {addingUserTo && (
        <AddCompanyUserDialog
          companyId={addingUserTo}
          companyName={db.companies.find((c) => c.id === addingUserTo)?.name || ""}
          onClose={() => setAddingUserTo(null)}
        />
      )}
    </AppShell>
  );
}

function AddCompanyUserDialog({
  companyId,
  companyName,
  onClose,
}: {
  companyId: string;
  companyName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("company_admin");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (password) {

        const res = await createDatabaseAuthUserFn({ data: { email, password } });
        if (!res.success) throw new Error(res.error || "Failed to create local password login.");
      }
      await dataSourceService.insert(
        "users" as any,
        {
          id: crypto.randomUUID(),
          company_id: companyId,
          name,
          email,
          role,
          active: true,
          created_at: new Date().toISOString(),
        } as any,
      );
      toast.success(`User ${email} securely provisioned to ${companyName}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provision User to {companyName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            This directly injects a pre-authorized Google Account mapping for this specific Tenant
            workspace.
          </p>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Google Email Address</Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
            <Label>Platform Role</Label>
            <select
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="company_admin">
                Company Admin (Can manage their own users + Google Drive integration)
              </option>
              <option value="department_user">
                Department User (Can only view active tasks and ask AI questions)
              </option>
            </select>
          </div>
          {errorMsg && (
            <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}
          <Button className="w-full mt-4" type="submit" disabled={loading}>
            {loading ? "Registering..." : `Authorize User for ${companyName}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
