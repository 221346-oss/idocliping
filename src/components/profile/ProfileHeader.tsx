import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileHeader() {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border h-11 flex items-center shrink-0">
      <div className="flex items-center justify-between px-4 md:px-6 w-full max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          {/* Heading removed per user request */}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
