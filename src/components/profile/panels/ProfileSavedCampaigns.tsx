import { Bookmark } from "lucide-react";

export function ProfileSavedCampaigns() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
      <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
      <p className="text-[13px] text-muted-foreground">Saved campaigns are not available yet.</p>
    </div>
  );
}
