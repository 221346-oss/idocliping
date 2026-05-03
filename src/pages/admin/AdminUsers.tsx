import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["admin", "brand", "creator", "user"];

export default function AdminUsers() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.rpc("get_team_members");
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, role: string) => {
    // Remove all roles, insert chosen one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Role updated" });
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Users" description="Manage roles across the platform." />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Job title</th><th className="text-left p-3">Role</th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.job_title || "—"}</td>
                  <td className="p-3">
                    <Select value={r.role} onValueChange={(v) => setRole(r.user_id, v)}>
                      <SelectTrigger className="h-7 w-32 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                    </Select>
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
