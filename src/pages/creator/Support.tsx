import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { TicketRowsSkeleton } from "@/components/leaderboard/LeaderboardSkeletons";
import { SUPPORT_STATUS_LABEL, SUPPORT_TICKET_TYPE_LABEL } from "@/lib/support-ticket-constants";
import { formatDistanceToNow } from "date-fns";
import { LifeBuoy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

type Row = {
  id: string;
  ticket_number: string;
  type: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const statusClass: Record<string, string> = {
  open: "bg-primary/15 text-primary border border-primary/30",
  in_progress: "bg-warning/15 text-warning border border-warning/30",
  resolved: "bg-muted text-muted-foreground border border-border",
  closed: "bg-secondary text-secondary-foreground border border-border",
};

export default function CreatorSupportList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, type, subject, status, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <CreatorShell>
      <PageContainer className="max-w-[900px] pb-10">
        <PageTitle
          action={
            <Link to="/support/new" className="btn-primary-pill h-10 gap-1.5 px-4 text-[13px]">
              <Plus className="h-4 w-4" /> New ticket
            </Link>
          }
        >
          Support
        </PageTitle>
        <p className="-mt-2 mb-4 text-[14px] text-muted-foreground">
          My tickets — we typically respond within 24–48 hours.
        </p>

        {loading ? (
          <TicketRowsSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="When you need help with payouts, campaigns, or your account, open a ticket — we typically respond within 24–48 hours."
            actionLabel="Submit a ticket"
            actionTo="/support/new"
            className="py-10"
          />
        ) : (
          <div className="surface-card divide-y divide-border/60 overflow-hidden">
            {rows.map((t) => (
              <Link
                key={t.id}
                to={`/support/${t.id}`}
                className="press-row focus-ring flex items-center gap-3 px-4 py-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-primary">
                  <LifeBuoy className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{t.subject}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                    <span className="font-mono">{t.ticket_number}</span> ·{" "}
                    {SUPPORT_TICKET_TYPE_LABEL[t.type] ?? t.type} ·{" "}
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide",
                    statusClass[t.status] ?? "",
                  )}
                >
                  {SUPPORT_STATUS_LABEL[t.status] ?? t.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </CreatorShell>
  );
}

