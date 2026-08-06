import { cn } from "@/lib/utils";

export type StatusKind =
  | "processing"
  | "eligible"
  | "ineligible"
  | "rejected"
  | "paid"
  | "active"
  | "pending"
  | "neutral";

const STATUS_LABEL: Record<StatusKind, string> = {
  processing: "Processing",
  eligible: "Eligible",
  ineligible: "Ineligible",
  rejected: "Rejected",
  paid: "Paid Out",
  active: "Active",
  pending: "Pending",
  neutral: "—",
};

const STATUS_CLASS: Record<StatusKind, string> = {
  processing: "bg-state-processing/[0.14] text-state-processing border-state-processing/35",
  eligible: "bg-state-eligible/[0.14] text-state-eligible border-state-eligible/35",
  ineligible: "bg-state-ineligible/[0.14] text-state-ineligible border-state-ineligible/35",
  rejected: "bg-state-rejected/[0.14] text-state-rejected border-state-rejected/35",
  paid: "bg-state-paid/[0.14] text-state-paid border-state-paid/35",
  active: "bg-primary/[0.14] text-primary border-primary/35",
  pending: "bg-state-processing/[0.14] text-state-processing border-state-processing/35",
  neutral: "bg-muted text-muted-foreground border-border",
};


/** Maps every raw status string in the app onto the five reference states. */
export function normalizeStatus(raw: string | null | undefined): StatusKind {
  const s = (raw ?? "").toLowerCase().trim();
  if (["paid", "paid_out", "paidout", "completed", "payout_complete"].includes(s)) return "paid";
  if (["approved", "eligible", "verified"].includes(s)) return "eligible";
  if (["pending", "processing", "in_review", "submitted", "review"].includes(s)) return "processing";
  if (["rejected", "denied", "banned", "flagged"].includes(s)) return "rejected";
  if (["ineligible", "invalid", "expired", "disqualified"].includes(s)) return "ineligible";
  if (["active", "live", "running"].includes(s)) return "active";
  if (!s) return "neutral";
  return "pending";
}

export function StatusChip({
  status,
  label,
  className,
  size = "md",
}: {
  status: StatusKind | string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const kind = (STATUS_LABEL as Record<string, string>)[status as string]
    ? (status as StatusKind)
    : normalizeStatus(String(status));

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12.5px]",
        STATUS_CLASS[kind],
        className,
      )}
    >
      {label ?? STATUS_LABEL[kind]}
    </span>
  );
}
