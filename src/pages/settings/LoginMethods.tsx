import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { Check, Mail, Plus } from "lucide-react";

export default function LoginMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [identities, setIdentities] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setIdentities((data.user?.identities ?? []).map((i: any) => String(i.provider)));
    })();
  }, [user]);

  const linkGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast({ title: "Could not link Google", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  const has = (p: string) => identities.includes(p);

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Login methods" onBack={() => navigate("/profile")} />
        <p className="mb-3 text-[13px] text-muted-foreground">
          You can sign in to iClips with any of the methods linked to this account.
        </p>

        <div className="list-group">
          <div className="list-row">
            <span className="list-row-icon">
              <Mail className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">Email code</span>
              <span className="block truncate text-[12.5px] font-normal text-muted-foreground">{user?.email}</span>
            </span>
            <Check className="h-[18px] w-[18px] shrink-0 text-primary" />
          </div>

          <button type="button" onClick={() => void linkGoogle()} disabled={has("google")} className="list-row">
            <span className="list-row-icon">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v3.2h5.35c-.25 1.5-1.8 4.4-5.35 4.4a6.2 6.2 0 1 1 0-12.4c1.77 0 2.96.75 3.64 1.4l2.48-2.4C16.5 3.7 14.5 2.8 12 2.8a9.2 9.2 0 1 0 0 18.4c5.3 0 8.8-3.72 8.8-8.96 0-.6-.07-1.06-.15-1.54Z"
                />
              </svg>
            </span>
            <span className="flex-1 truncate">Google</span>
            {has("google") ? (
              <Check className="h-[18px] w-[18px] shrink-0 text-primary" />
            ) : (
              <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                <Plus className="h-4 w-4" /> Link
              </span>
            )}
          </button>
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
