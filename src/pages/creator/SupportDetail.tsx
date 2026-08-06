import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORT_STATUS_LABEL,
  SUPPORT_TICKET_TYPE_LABEL,
} from "@/lib/support-ticket-constants";
import { signedSupportAttachmentUrl } from "@/lib/support-ticket-storage";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketPreview = Pick<
  Tables<"support_tickets">,
  "id" | "ticket_number" | "type" | "subject" | "description" | "status" | "priority" | "created_at" | "updated_at"
>;

export default function CreatorSupportDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<TicketPreview | null>(null);
  const [messages, setMessages] = useState<Tables<"ticket_messages">[]>([]);
  const [attachments, setAttachments] = useState<{ id: string; url: string }[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!id || !user) return;
    const { data: t, error: te } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, type, subject, description, status, priority, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (te || !t) {
      setTicket(null);
      setAttachments([]);
      setLoading(false);
      return;
    }
    setTicket(t);

    const [{ data: m }, { data: atts }] = await Promise.all([
      supabase
        .from("ticket_messages")
        .select("id, sender_role, message, created_at, is_internal")
        .eq("ticket_id", id)
        .eq("is_internal", false)
        .order("created_at", { ascending: true }),
      supabase.from("ticket_attachments").select("id, file_url").eq("ticket_id", id).order("uploaded_at", { ascending: true }),
    ]);

    setMessages((m ?? []) as Tables<"ticket_messages">[]);

    const urls: { id: string; url: string }[] = [];
    for (const a of atts ?? []) {
      const url = await signedSupportAttachmentUrl(a.file_url);
      if (url) urls.push({ id: a.id, url });
    }
    setAttachments(urls);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [id, user]);

  const sendReply = async () => {
    if (!user || !id || !reply.trim()) return;
    setSending(true);
    const row: TablesInsert<"ticket_messages"> = {
      ticket_id: id,
      sender_role: "creator",
      message: reply.trim().slice(0, 4000),
      is_internal: false,
    };
    const { error } = await supabase.from("ticket_messages").insert(row);
    setSending(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    await load();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="p-6 text-[13px] text-muted-foreground">Ticket not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Button variant="ghost" size="sm" className="h-8 -ml-2" asChild>
          <Link to="/support">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> My Tickets
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2 items-start justify-between">
          <div>
            <span className="font-mono text-[12px] text-muted-foreground">{ticket.ticket_number}</span>
            <h1 className="text-[16px] font-semibold mt-1">{ticket.subject}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{SUPPORT_TICKET_TYPE_LABEL[ticket.type]}</Badge>
              <Badge variant="secondary">{SUPPORT_STATUS_LABEL[ticket.status]}</Badge>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4 text-[13px] whitespace-pre-wrap">{ticket.description}</div>

        {attachments.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Attachments</h2>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block rounded border border-border overflow-hidden w-24 h-24 bg-muted/30">
                  <img src={a.url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <h2 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Thread</h2>
          {messages.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No replies yet.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[13px]",
                    msg.sender_role === "admin"
                      ? "border-primary/30 bg-primary/5 ml-4"
                      : "border-border bg-card mr-4",
                  )}
                >
                  <span className="text-[10px] uppercase text-muted-foreground">{msg.sender_role === "admin" ? "Support" : "You"}</span>
                  <p className="mt-1 whitespace-pre-wrap">{msg.message}</p>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ticket.status !== "closed" ? (
          <div className="space-y-2 pt-2 border-t border-border">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Your reply…" className="min-h-[100px] text-[13px]" />
            <Button type="button" size="sm" disabled={sending || !reply.trim()} onClick={() => void sendReply()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send reply
            </Button>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
