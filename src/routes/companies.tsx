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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { dataSourceService } from "@/lib/data/dataSource";

export const Route = createFileRoute("/companies")({
    component: CompaniesPage,
});

function CompaniesPage() {
    const user = useSession();
    const db = useDatabase();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    if (!user) return <Navigate to="/" replace />;
    if (user.role !== "super_admin") return <Navigate to="/dashboard" replace />;

    async function handleCreateCompany(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await dataSourceService.insert("companies" as any, {
                id: uid("co"),
                name,
                code: code.toUpperCase().replace(/\s/g, '_'),
                description,
                status: "active",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as any);

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

    const filteredCompanies = db.companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

    return (
        <AppShell
            title="Multi-Tenant Configuration"
            subtitle="Manage client companies and organization siloes (Super Admin Only)"
            actions={
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 size-4" /> Register New Company</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Register Tenant</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input required placeholder="Acme Corp" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Company Code (Unique Identifier)</Label>
                                <Input required placeholder="ACME" value={code} onChange={e => setCode(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input placeholder="Brief details about tenant..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Registering..." : "Register Company"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            }
        >
            <div className="flex items-center gap-2 mb-6 max-w-sm">
                <Search className="size-4 text-muted-foreground" />
                <Input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map(co => {
                    const coUsers = db.users.filter(u => u.company_id === co.id);
                    const coAdmins = coUsers.filter(u => u.role === 'company_admin');
                    return (
                        <div key={co.id} className="border bg-card rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-lg">{co.name}</h3>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{co.code}</p>
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${co.status === 'active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                    {co.status === 'active' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                                    {co.status}
                                </span>
                            </div>
                            {co.description && <p className="text-sm text-muted-foreground">{co.description}</p>}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3 mt-1">
                                <span><strong>{coUsers.length}</strong> Total Provisioned Users</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                <strong>Admins:</strong> {coAdmins.length > 0 ? coAdmins.map(a => a.email).join(', ') : 'None assigned yet'}
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
        </AppShell>
    );
}
