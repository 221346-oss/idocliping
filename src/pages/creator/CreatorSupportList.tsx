import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketRowsSkeleton } from "@/components/leaderboard/LeaderboardSkeletons";
import { SUPPORT_STATUS_LABEL, SUPPORT_TICKET_TYPE_LABEL } from "@/lib/support-ticket-constants";
import { formatDistanceToNow } from "date-fns";
import { LifeBuoy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-[13px] font-medium">Help &amp; Support</h1>
          </div>
          <Button asChild size="sm" className="h-7 text-[12px]">
            <Link to="/creator/support/new">
              <Plus className="h-3.5 w-3.5 mr-1" /> Submit a Ticket
            </Link>
          </Button>
        </div>
        <div className="px-4 md:px-6 py-4 flex-1">
          <p className="text-[12px] text-muted-foreground mb-4">My Tickets — we typically respond within 24–48 hours.</p>
          {loading ? (
            <TicketRowsSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-muted-foreground">
              No tickets yet.{" "}
              <Link to="/creator/support/new" className="text-primary underline">
                Submit your first ticket
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/creator/support/${t.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-mono text-[12px] text-muted-foreground">{t.ticket_number}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {SUPPORT_TICKET_TYPE_LABEL[t.type] ?? t.type}
                    </Badge>
                    <span className="text-[13px] font-medium flex-1 min-w-[140px] truncate">{t.subject}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md uppercase", statusClass[t.status] ?? "")}>
                      {SUPPORT_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
