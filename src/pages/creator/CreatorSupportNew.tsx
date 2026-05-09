import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_TICKET_TYPE_LABEL,
} from "@/lib/support-ticket-constants";
import { uploadTicketAttachment, validateSupportImage } from "@/lib/support-ticket-storage";
import type { Enums, TablesInsert } from "@/integrations/supabase/types";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type TicketInsert = TablesInsert<"support_tickets">;
type TicketType = Enums<"support_ticket_type">;
type TicketPriority = Enums<"support_ticket_priority">;

export default function CreatorSupportNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<TicketType>("bug_report");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [files, setFiles] = useState<File[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !description.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    if (files.length > 3) {
      toast({ title: "Too many files", description: "Maximum 3 images.", variant: "destructive" });
      return;
    }
    for (const f of files) {
      const v = validateSupportImage(f);
      if (v) {
        toast({ title: "Invalid attachment", description: v, variant: "destructive" });
        return;
      }
    }

    setBusy(true);
    try {
      const insertRow: TicketInsert = {
        user_id: user.id,
        type,
        subject: subject.trim().slice(0, 100),
        description: description.trim().slice(0, 1000),
        priority,
      };

      const { data, error } = await supabase.from("support_tickets").insert(insertRow).select("id, ticket_number").single();

      if (error) throw error;
      if (!data) throw new Error("No ticket returned");

      for (const file of files) {
        const { path, error: upErr } = await uploadTicketAttachment(user.id, data.id, file);
        if (upErr || !path) throw upErr ?? new Error("Upload failed");
        const { error: attErr } = await supabase.from("ticket_attachments").insert({
          ticket_id: data.id,
          file_url: path,
        });
        if (attErr) throw attErr;
      }

      toast({
        title: "Ticket submitted",
        description: `${data.ticket_number} — we’ll respond within 24–48 hours.`,
      });
      navigate(`/creator/support/${data.id}`);
    } catch (err: unknown) {
      toast({
        title: "Could not submit",
        description: err instanceof Error ? err.message : "Run database migration 006_support_cosmetics_leaderboard.sql",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: File[] = [...files];
    for (let i = 0; i < list.length && next.length < 3; i++) {
      next.push(list[i]);
    }
    setFiles(next.slice(0, 3));
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full max-w-xl mx-auto w-full px-4 py-4">
        <Button variant="ghost" size="sm" className="h-8 w-fit mb-4 -ml-2" asChild>
          <Link to="/creator/support">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Link>
        </Button>
        <h1 className="text-[15px] font-semibold mb-1">Submit a Ticket</h1>
        <p className="text-[12px] text-muted-foreground mb-6">Describe your issue and we’ll get back to you.</p>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[12px]">Ticket type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORT_TICKET_TYPE_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} className="h-9 text-[13px]" required />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="min-h-[140px] text-[13px]" required />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Priority (optional)</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORT_PRIORITY_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[12px]">Attachments (optional, up to 3 images)</Label>
            <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="h-9 text-[13px]" onChange={onPickFiles} disabled={busy || files.length >= 3} />
            <p className="text-[11px] text-muted-foreground">PNG, JPEG, WebP, or GIF — max 5 MB each.</p>
            {files.length > 0 ? (
              <ul className="space-y-1">
                {files.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className={cn("flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 text-[12px]")}>
                    <span className="truncate">{f.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Ticket
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
