import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_STATUS_LABEL,
  SUPPORT_TICKET_TYPE_LABEL,
} from "@/lib/support-ticket-constants";
import { signedSupportAttachmentUrl } from "@/lib/support-ticket-storage";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketRow = Tables<"support_tickets">;

export default function AdminTickets() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<Tables<"ticket_messages">[]>([]);
  const [attachments, setAttachments] = useState<{ id: string; url: string }[]>([]);
  const [reply, setReply] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [status, setStatus] = useState<TicketRow["status"]>("open");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setRows([]);
      setProfileNames(new Map());
    } else {
      const list = data ?? [];
      setRows(list);
      const ids = [...new Set(list.map((r) => r.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const m = new Map<string, string>();
        for (const p of profs ?? []) {
          m.set(p.user_id, (p.full_name || "").trim() || p.user_id.slice(0, 8));
        }
        setProfileNames(m);
      } else setProfileNames(new Map());
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;

    return rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType !== "all" && r.type !== filterType) return false;
      if (filterPriority !== "all" && r.priority !== filterPriority) return false;
      const c = new Date(r.created_at).getTime();
      if (fromMs !== null && c < fromMs) return false;
      if (toMs !== null && c > toMs) return false;
      return true;
    });
  }, [rows, filterStatus, filterType, filterPriority, dateFrom, dateTo]);

  const openDetail = async (t: TicketRow) => {
    setSelected(t);
    setStatus(t.status);
    setInternalNotes(t.internal_notes ?? "");
    const [{ data: msg }, { data: atts }] = await Promise.all([
      supabase.from("ticket_messages").select("*").eq("ticket_id", t.id).order("created_at", { ascending: true }),
      supabase.from("ticket_attachments").select("id, file_url").eq("ticket_id", t.id).order("uploaded_at", { ascending: true }),
    ]);
    setMessages((msg ?? []) as Tables<"ticket_messages">[]);
    const urls: { id: string; url: string }[] = [];
    for (const a of atts ?? []) {
      const url = await signedSupportAttachmentUrl(a.file_url);
      if (url) urls.push({ id: a.id, url });
    }
    setAttachments(urls);
  };

  const saveTicket = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status,
          internal_notes: internalNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;
      if (reply.trim()) {
        const msgRow: TablesInsert<"ticket_messages"> = {
          ticket_id: selected.id,
          sender_role: "admin",
          message: reply.trim(),
          is_internal: false,
        };
        const { error: me } = await supabase.from("ticket_messages").insert(msgRow);
        if (me) throw me;
      }
      toast({ title: "Saved" });
      setReply("");
      await load();
      const { data: fresh } = await supabase.from("support_tickets").select("*").eq("id", selected.id).maybeSingle();
      if (fresh) await openDetail(fresh as TicketRow);
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Ticket Manager" description="Support queue — reply updates the thread." />
      <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto border-b lg:border-b-0 lg:border-r border-border p-4 md:p-6">
          <div className="flex flex-wrap gap-2 mb-4 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.keys(SUPPORT_STATUS_LABEL).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SUPPORT_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[150px] text-[12px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.keys(SUPPORT_TICKET_TYPE_LABEL).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SUPPORT_TICKET_TYPE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 w-[140px] text-[12px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {Object.keys(SUPPORT_PRIORITY_LABEL).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SUPPORT_PRIORITY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Created from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-[12px] w-[132px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Created to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-[12px] w-[132px]" />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { setFilterStatus("all"); setFilterType("all"); setFilterPriority("all"); setDateFrom(""); setDateTo(""); }}>
              Clear filters
            </Button>
          </div>

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
              <table className="w-full text-[12px] min-w-[720px]">
                <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase border-b border-border">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Creator</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Subject</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2 hidden xl:table-cell">Created</th>
                    <th className="text-left p-2 hidden xl:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className={cn(
                        "border-t border-border cursor-pointer hover:bg-muted/30",
                        selected?.id === t.id && "bg-muted/40",
                      )}
                      onClick={() => void openDetail(t)}
                    >
                      <td className="p-2 font-mono text-muted-foreground">{t.ticket_number}</td>
                      <td className="p-2 max-w-[140px] truncate text-[13px]" title={profileNames.get(t.user_id) ?? t.user_id}>
                        {profileNames.get(t.user_id) ?? `${t.user_id.slice(0, 8)}…`}
                      </td>
                      <td className="p-2">{SUPPORT_TICKET_TYPE_LABEL[t.type] ?? t.type}</td>
                      <td className="p-2 max-w-[180px] truncate">{t.subject}</td>
                      <td className="p-2">{SUPPORT_PRIORITY_LABEL[t.priority] ?? t.priority}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {SUPPORT_STATUS_LABEL[t.status]}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </td>
                      <td className="p-2 text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[380px] shrink-0 overflow-y-auto p-4 md:p-6 bg-muted/10 border-t lg:border-t-0 lg:border-l border-border">
          {!selected ? (
            <p className="text-[13px] text-muted-foreground">Select a ticket</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">{selected.ticket_number}</p>
                <h2 className="text-[14px] font-semibold">{selected.subject}</h2>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}</p>
              </div>
              <p className="text-[12px] whitespace-pre-wrap rounded-md border border-border bg-background p-3">{selected.description}</p>

              {attachments.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-[11px]">Attachments</Label>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block rounded border border-border overflow-hidden w-20 h-20 bg-muted/30">
                        <img src={a.url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <Label className="text-[11px]">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TicketRow["status"])}>
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORT_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Internal notes (admin only)</Label>
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="min-h-[72px] text-[12px]" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px]">Reply to creator</Label>
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Visible reply…" className="min-h-[88px] text-[12px]" />
              </div>

              <Button size="sm" className="w-full h-9 text-[12px]" disabled={busy} onClick={() => void saveTicket()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Reply &amp; Update Status
              </Button>

              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Thread</p>
                <ul className="space-y-2 max-h-[240px] overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className={cn("text-[12px] rounded border px-2 py-1.5", m.sender_role === "admin" ? "border-primary/30 bg-primary/5" : "border-border")}>
                      <span className="text-[10px] text-muted-foreground">{m.sender_role}</span>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
