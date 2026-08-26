import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/useSession";
import { approvalService } from "@/lib/services/approvalService";
import { useDatabase } from "@/lib/store";
import { VEHICLE_TYPES } from "@/lib/types";

export const Route = createFileRoute("/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicle Entries — Vecta Logic" },
      {
        name: "description",
        content:
          "Log vehicle entries at the gate and track their approval status across branches and companies.",
      },
      { property: "og:title", content: "Vehicle Entries — Vecta Logic" },
      {
        property: "og:description",
        content: "Capture vehicle number, company, driver, type and location, then route for approval.",
      },
    ],
  }),
  component: VehiclesPage,
});

const BRANCHES = ["Chennai", "Bangalore", "Coimbatore", "Hyderabad"];

function VehiclesPage() {
  const user = useSession();
  const db = useDatabase();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);

  const rows = approvalService.rows();
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          [row.entry.vehicle_number, row.entry.company_name, row.entry.driver_name, row.entry.location]
            .join(" ")
            .toLowerCase()
            .includes(q);
        const matchS = status === "all" || row.request.status === status;
        return matchQ && matchS;
      }),
    [rows, query, status],
  );

  if (!user) return <AppShell title="Vehicle Entries">{null}</AppShell>;
  const canCreate = user.role === "data_entry" || user.role === "admin";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const result = approvalService.createEntryWithApproval({
      vehicle_number: get("vehicle_number"),
      company_name: get("company_name"),
      driver_name: get("driver_name"),
      vehicle_type: get("vehicle_type"),
      location: get("location"),
      entry_date: get("entry_date"),
      entry_time: get("entry_time"),
      remarks: get("remarks"),
      created_by: user.id,
    });

    setOpen(false);
    toast.success(`Vehicle ${result.entry.vehicle_number} submitted`, {
      description: result.unassigned
        ? "No approver mapping matched — admins have been notified."
        : "Approval request sent to the mapped approver.",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toTimeString().slice(0, 5);

  return (
    <AppShell
      title="Vehicle Entries"
      subtitle={`${filtered.length} of ${rows.length} manifest records`}
      actions={
        canCreate ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New vehicle entry</DialogTitle>
                <DialogDescription>
                  The approver is resolved automatically from branch, company and vehicle type.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_number">Vehicle number</Label>
                  <Input id="vehicle_number" name="vehicle_number" required placeholder="TN01AB1234" className="font-mono uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Company</Label>
                  <Input id="company_name" name="company_name" required defaultValue="ABC Transport" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver_name">Driver name</Label>
                  <Input id="driver_name" name="driver_name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle_type">Vehicle type</Label>
                  <Select name="vehicle_type" defaultValue={VEHICLE_TYPES[0]}>
                    <SelectTrigger id="vehicle_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Branch / location</Label>
                  <Select name="location" defaultValue={user.branch}>
                    <SelectTrigger id="location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="entry_date">Date</Label>
                    <Input id="entry_date" name="entry_date" type="date" defaultValue={today} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="entry_time">Time</Label>
                    <Input id="entry_time" name="entry_time" type="time" defaultValue={now} required />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" rows={2} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full">
                    Submit for approval
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vehicle, company, driver, branch"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-surface-muted">
            <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:font-mono [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-[0.08em] [&>th]:text-muted-foreground">
              <th>Vehicle</th>
              <th>Company</th>
              <th>Driver</th>
              <th>Type</th>
              <th>Branch</th>
              <th>Date / time</th>
              <th>Approver</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((row) => (
              <tr key={row.request.id} className="hover:bg-muted/60 [&>td]:px-4 [&>td]:py-2.5">
                <td className="font-mono font-medium">{row.entry.vehicle_number}</td>
                <td>{row.entry.company_name}</td>
                <td>{row.entry.driver_name}</td>
                <td className="text-muted-foreground">{row.entry.vehicle_type}</td>
                <td>{row.entry.location}</td>
                <td className="font-mono text-xs text-muted-foreground">
                  {row.entry.entry_date} {row.entry.entry_time}
                </td>
                <td>{row.approver?.name ?? <span className="text-danger">Unassigned</span>}</td>
                <td>
                  <StatusBadge status={row.request.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No entries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="label-mono mt-3">
        Source: {db.vehicle_entries.length} demo records · Google Drive sync not connected
      </p>
    </AppShell>
  );
}
