import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
const PAGE = 50;

type Row = {
  user_id: string;
  full_name: string;
  profile_slug: string | null;
  profile_hidden: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminCreatorProfiles() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, profile_slug, profile_hidden, created_at, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    const term = activeQuery.trim();
    if (term) {
      if (/^[0-9a-f-]{36}$/i.test(term)) {
        query = query.eq("user_id", term);
      } else {
        const like = `%${term}%`;
        query = query.or(`full_name.ilike.${like},profile_slug.ilike.${like}`);
      }
    }

    const { data, error, count } = await query;
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setRows([]);
      setTotal(0);
    } else {
      setRows((data ?? []) as Row[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, activeQuery, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHidden = async (userId: string, next: boolean) => {
    setSaving(userId);
    try {
      const { error } = await supabase.from("profiles").update({ profile_hidden: next, updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) throw error;
      toast({ title: next ? "Profile hidden" : "Profile visible" });
      await load();
    } catch (e: unknown) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <AppLayout>
      <PageHeader
        title="Creator profiles"
        description="Search and moderate public profiles (bulk-friendly pagination)."
      />
      <div className="p-4 md:p-6 space-y-4 max-w-6xl">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, slug, or user UUID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 max-w-sm text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(0);
                setActiveQuery(q);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => {
              setPage(0);
              setActiveQuery(q);
            }}
          >
            Search
          </Button>
          <span className="text-[12px] text-muted-foreground ml-auto">{total.toLocaleString()} profiles</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-[12px] min-w-[640px]">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] uppercase">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Slug</th>
                  <th className="text-left p-2 font-mono">User ID</th>
                  <th className="text-left p-2">Hidden</th>
                  <th className="text-left p-2">Updated</th>
                  <th className="text-right p-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-2 font-medium max-w-[180px] truncate">{r.full_name || "—"}</td>
                    <td className="p-2 text-muted-foreground">{r.profile_slug ?? "—"}</td>
                    <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.user_id.slice(0, 8)}…</td>
                    <td className="p-2">
                      <Switch
                        checked={r.profile_hidden}
                        disabled={saving === r.user_id}
                        onCheckedChange={(v) => void toggleHidden(r.user_id, v)}
                      />
                    </td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">{new Date(r.updated_at).toLocaleString()}</td>
                    <td className="p-2 text-right">
                      <Link to={`/profile/${r.user_id}`} className="text-primary hover:underline text-[11px]">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-[12px]">
          <Button type="button" variant="outline" size="sm" className="h-7" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} / {pages}
          </span>
          <Button type="button" variant="outline" size="sm" className="h-7" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
