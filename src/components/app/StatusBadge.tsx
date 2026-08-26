import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/lib/types";

const MAP: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning-soft text-warning" },
  approved: { label: "Approved", className: "bg-success-soft text-success" },
  rejected: { label: "Rejected", className: "bg-danger-soft text-danger" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApprovalStatus;
  className?: string;
}) {
  const cfg = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        cfg.className,
        className,
      )}
    >
      {status === "pending" && (
        <span className="animate-pulse-dot inline-block size-1.5 rounded-full bg-current" />
      )}
      {cfg.label}
    </span>
  );
}
