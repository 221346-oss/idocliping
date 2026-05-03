import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";

export default function CreatorSubmissions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, campaigns(title)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppLayout>
      <PageHeader title="My submissions" description="Status and review notes for every post you submitted." />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No submissions yet.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Campaign</th>
                <th className="text-left p-3">Platform</th>
                <th className="text-left p-3">URL</th>
                <th className="text-right p-3">Views</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.campaigns?.title ?? "—"}</td>
                  <td className="p-3 capitalize">{r.platform}</td>
                  <td className="p-3 max-w-[280px]"><a href={r.post_url} target="_blank" rel="noreferrer" className="text-foreground underline truncate block">{r.post_url}</a></td>
                  <td className="p-3 text-right">{Number(r.manual_views).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded uppercase tracking-wide ${
                      r.status === "approved" ? "bg-success/15 text-success" :
                      r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-warning/15 text-warning"
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </AppLayout>
  );
}
