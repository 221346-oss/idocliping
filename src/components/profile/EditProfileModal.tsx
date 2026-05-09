import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CreatorProfile;
}

export function EditProfileModal({ open, onOpenChange, profile }: EditProfileModalProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [selectedCosmetics, setSelectedCosmetics] = useState<Record<string, string>>({
    avatar_frame: profile.cosmetics.find(c => c.type === "avatar_frame" && c.equipped)?.id || "",
    badge: profile.cosmetics.find(c => c.type === "badge" && c.equipped)?.id || "",
    effect: profile.cosmetics.find(c => c.type === "effect" && c.equipped)?.id || "",
    title: profile.cosmetics.find(c => c.type === "title" && c.equipped)?.id || "",
  });

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
    onOpenChange(false);
  };

  const cosmeticsByType = {
    avatar_frame: profile.cosmetics.filter(c => c.type === "avatar_frame"),
    badge: profile.cosmetics.filter(c => c.type === "badge"),
    effect: profile.cosmetics.filter(c => c.type === "effect"),
    title: profile.cosmetics.filter(c => c.type === "title"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border rounded-md shadow-2xl">
        <DialogHeader className="border-b border-border pb-3 mb-4">
          <DialogTitle className="text-[15px] font-bold text-foreground">Edit Profile</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-9 rounded-md">
            <TabsTrigger value="general" className="text-[12px] h-7 data-[state=active]:bg-background">General</TabsTrigger>
            <TabsTrigger value="cosmetics" className="text-[12px] h-7 data-[state=active]:bg-background">Cosmetics</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-9 bg-muted/30 border-border text-[13px] text-foreground focus-visible:ring-primary/20"
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                className="bg-muted/30 border-border text-[13px] text-foreground resize-none focus-visible:ring-primary/20"
                placeholder="Tell us about yourself"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground text-right">{bio.length}/200</p>
            </div>

            <div className="bg-muted/10 border border-border rounded-md p-3 space-y-2">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Account Details</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-muted-foreground">Username</span>
                  <span className="text-foreground font-mono">@{profile.username}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="text-foreground">{profile.joinedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-muted-foreground">Trust Level</span>
                  <span className="text-primary font-bold">{profile.level}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cosmetics Tab */}
          <TabsContent value="cosmetics" className="space-y-4 mt-6">
            <div className="space-y-5">
              {Object.entries(cosmeticsByType).map(([type, cosmetics]) => (
                <div key={type} className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                    {type.replace("_", " ")}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setSelectedCosmetics({ ...selectedCosmetics, [type]: "" })}
                      className={`p-2 rounded-md border transition-all flex flex-col items-center justify-center gap-1 ${
                        !selectedCosmetics[type]
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <Sparkles className="h-4 w-4 opacity-50" />
                      <p className="text-[10px] font-medium">None</p>
                    </button>
                    {cosmetics.map((cosmetic) => (
                      <button
                        key={cosmetic.id}
                        onClick={() => setSelectedCosmetics({ ...selectedCosmetics, [type]: cosmetic.id })}
                        className={`p-2 rounded-md border transition-all flex flex-col items-center justify-center gap-1 ${
                          selectedCosmetics[type] === cosmetic.id
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border bg-muted/20 hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-lg">{cosmetic.icon}</span>
                        <p className="text-[10px] font-medium truncate w-full">{cosmetic.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-[12px] text-muted-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-8 text-[12px] px-4"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
