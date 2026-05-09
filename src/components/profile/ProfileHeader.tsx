import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileHeader() {
  return (
    <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-yellow-500/20">
      <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-slate-900">C</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">FREE FIRE</h1>
            <p className="text-xs text-slate-400">Creator Profile</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
