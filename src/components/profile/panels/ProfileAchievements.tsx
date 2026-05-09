import { Trophy } from "lucide-react";

export function ProfileAchievements() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
      <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
      <p className="text-[13px] text-muted-foreground">Achievement badges will appear here as we roll out seasons and milestones.</p>
    </div>
  );
}
